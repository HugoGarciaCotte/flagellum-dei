/**
 * DUP-01: a game_players row whose (game_id, user_id) already exists
 * server-side under a different id (legacy phantom join row) must be adopted
 * from the server — never quarantined, never retried forever. Covers the
 * single-row chunk path, the bulk-fallback path, and the one-shot release of
 * rows parked before the resolver existed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const DUP_ERROR = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "game_players_game_id_user_id_key"',
};

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsert: vi.fn(),       // (table, rows, opts) => { error }
  selectResult: vi.fn(), // (table, filters) => { data, error }
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: (table: string) => ({
      upsert: (rows: unknown, opts: unknown) => Promise.resolve(mocks.upsert(table, rows, opts)),
      select: () => {
        const filters: Record<string, unknown> = {};
        const builder: any = {
          eq(key: string, val: unknown) { filters[key] = val; return builder; },
          then(resolve: any, reject: any) {
            return Promise.resolve(mocks.selectResult(table, filters)).then(resolve, reject);
          },
        };
        return builder;
      },
    }),
  },
}));

vi.mock("./swCachePurge", () => ({
  purgeSwRestCaches: vi.fn(async () => {}),
  swRestCachePurged: Promise.resolve(),
}));
vi.mock("./scenarioOverrides", () => ({
  invalidateScenarioOverrides: vi.fn(),
  loadScenarioOverrides: vi.fn(async () => ({})),
  refreshScenarioOverrides: vi.fn(async () => {}),
}));
vi.mock("./featOverrides", () => ({
  invalidateOverrides: vi.fn(),
  loadFeatOverrides: vi.fn(async () => ({})),
  refreshFeatOverrides: vi.fn(async () => {}),
}));

async function freshModules() {
  localStorage.clear();
  vi.resetModules();
  const store = await import("./localStore");
  const sync = await import("./syncManager");
  return { store, sync };
}

// Sync errors are mirrored to console.error (LOG-01); keep test output clean.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getSession.mockReset();
  mocks.upsert.mockReset();
  mocks.selectResult.mockReset();
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
  mocks.upsert.mockReturnValue({ error: null });
  mocks.selectResult.mockReturnValue({ data: [], error: null });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("DUP-01: duplicate game_players membership is adopted, not quarantined", () => {
  it("replaces the local phantom with the server row on 23505 (single-row chunk)", async () => {
    const { store, sync } = await freshModules();
    sync.setCurrentUserId("u1");
    store.upsertRow("game_players", { id: "phantom", game_id: "g1", user_id: "u1", character_id: "c1" });

    mocks.upsert.mockReturnValue({ error: DUP_ERROR });
    const serverRow = { id: "server-row", game_id: "g1", user_id: "u1", character_id: null };
    mocks.selectResult.mockReturnValue({ data: [serverRow], error: null });

    await sync.pushAll();
    await sync.pushAll(); // drains the reconcile pull enqueued by the resolver

    expect(store.getTableRaw("game_players").map((r: any) => r.id)).toEqual(["server-row"]);
    expect(store.getQuarantine()).toEqual([]);
    expect(store.getDirtyRows()).toEqual([]);
    expect(store.getSyncErrors()).toEqual([]); // resolution is success, not an error
  });

  it("adopts the phantom via the per-row fallback without harming healthy rows", async () => {
    const { store, sync } = await freshModules();
    sync.setCurrentUserId("u1");
    store.upsertRow("game_players", { id: "healthy", game_id: "g2", user_id: "u1" });
    store.upsertRow("game_players", { id: "phantom", game_id: "g1", user_id: "u1" });

    mocks.upsert.mockImplementation((_table: string, rows: any) => {
      if (Array.isArray(rows)) return { error: DUP_ERROR }; // bulk chunk fails
      return rows.id === "phantom" ? { error: DUP_ERROR } : { error: null };
    });
    mocks.selectResult.mockReturnValue({ data: [{ id: "server-row", game_id: "g1", user_id: "u1" }], error: null });

    await sync.pushAll();
    await sync.pushAll();

    const ids = store.getTableRaw("game_players").map((r: any) => r.id).sort();
    expect(ids).toEqual(["healthy", "server-row"]);
    expect(store.getQuarantine()).toEqual([]);
    expect(store.getDirtyRows()).toEqual([]);
  });

  it("still quarantines 23505 on other tables", async () => {
    const { store, sync } = await freshModules();
    sync.setCurrentUserId("u1");
    store.upsertRow("characters", { id: "char1", user_id: "u1", name: "Dup" });
    mocks.upsert.mockReturnValue({ error: { code: "23505", message: "duplicate key value" } });

    await sync.pushAll();

    expect(store.getQuarantine().map((q) => q.id)).toEqual(["char1"]);
    expect(store.getDirtyRows()).toEqual([]);
  });
});

describe("DUP-01: one-shot release of legacy parked duplicates", () => {
  it("re-queues only game_players rows parked with 23505", async () => {
    const { store, sync } = await freshModules();
    store.upsertRow("game_players", { id: "phantom", game_id: "g1", user_id: "u1" });
    store.quarantineRow("game_players", "phantom", "terminal-error", DUP_ERROR);
    store.upsertRow("game_players", { id: "denied", game_id: "g1", user_id: "u2" });
    store.quarantineRow("game_players", "denied", "terminal-error", { code: "42501", message: "RLS" });
    store.upsertRow("characters", { id: "char1", user_id: "u1" });
    store.quarantineRow("characters", "char1", "terminal-error", { code: "23505", message: "duplicate key value" });
    expect(store.getQuarantine()).toHaveLength(3);

    sync.attachOnlineListener();

    expect(store.getQuarantine().map((q) => q.id).sort()).toEqual(["char1", "denied"]);
    expect(store.getDirtyRows()).toEqual([{ table: "game_players", id: "phantom" }]);
  });
});
