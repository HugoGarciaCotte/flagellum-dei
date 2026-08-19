/**
 * LOG-01 (remote half): the reporter queues errors in localStorage and ships
 * them fire-and-forget. It must never throw, never spin without a session,
 * and must disable itself on terminal server errors (e.g. table not migrated).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: () => ({ insert: mocks.insert }),
  },
}));

async function freshModules() {
  localStorage.clear();
  vi.resetModules();
  const store = await import("./localStore");
  const reporter = await import("./syncErrorReporter");
  return { store, reporter };
}

beforeEach(() => {
  localStorage.clear();
  mocks.getSession.mockReset();
  mocks.insert.mockReset();
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
  mocks.insert.mockResolvedValue({ error: null });
});

function outbox(store: typeof import("./localStore")) {
  const raw = localStorage.getItem(store.SYNC_ERROR_OUTBOX_KEY);
  return raw ? JSON.parse(raw) : [];
}

describe("enqueueSyncErrorUpload", () => {
  it("collapses identical consecutive errors and caps the queue at 200", async () => {
    const { store, reporter } = await freshModules();
    const at = new Date().toISOString();
    reporter.enqueueSyncErrorUpload({ at, table: "pull", ids: [], message: "Failed to fetch" });
    reporter.enqueueSyncErrorUpload({ at, table: "pull", ids: [], message: "Failed to fetch" });
    expect(outbox(store)).toHaveLength(1);
    expect(outbox(store)[0].count).toBe(2);
    for (let i = 0; i < 250; i++) {
      reporter.enqueueSyncErrorUpload({ at, table: "t", ids: [], message: `e${i}` });
    }
    expect(outbox(store)).toHaveLength(200);
  });
});

describe("flushSyncErrorUploads", () => {
  it("leaves the queue untouched when there is no session (local guest)", async () => {
    const { store, reporter } = await freshModules();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    reporter.enqueueSyncErrorUpload({ at: new Date().toISOString(), table: "t", ids: [], message: "x" });
    await reporter.flushSyncErrorUploads();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(outbox(store)).toHaveLength(1);
  });

  it("inserts queued errors and drains the queue on success", async () => {
    const { store, reporter } = await freshModules();
    reporter.enqueueSyncErrorUpload({ at: "2026-08-20T00:00:00.000Z", table: "games", ids: ["g1"], message: "boom" });
    await reporter.flushSyncErrorUploads();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const rows = mocks.insert.mock.calls[0][0];
    expect(rows[0]).toMatchObject({ table_name: "games", row_ids: ["g1"], message: "boom", count: 1 });
    expect(outbox(store)).toHaveLength(0);
  });

  it("keeps the queue on a transient insert error", async () => {
    const { store, reporter } = await freshModules();
    mocks.insert.mockResolvedValue({ error: { message: "Failed to fetch" } });
    reporter.enqueueSyncErrorUpload({ at: new Date().toISOString(), table: "t", ids: [], message: "x" });
    await reporter.flushSyncErrorUploads();
    expect(outbox(store)).toHaveLength(1);
    expect(reporter.remoteLogDisabledReason()).toBeNull();
  });

  it("disables itself (but keeps the queue) on a terminal error like a missing table", async () => {
    const { store, reporter } = await freshModules();
    mocks.insert.mockResolvedValue({ error: { code: "42P01", message: 'relation "public.sync_errors" does not exist' } });
    reporter.enqueueSyncErrorUpload({ at: new Date().toISOString(), table: "t", ids: [], message: "x" });
    await reporter.flushSyncErrorUploads();
    expect(outbox(store)).toHaveLength(1);
    expect(reporter.remoteLogDisabledReason()).toContain("does not exist");
    // Second flush is a no-op: no further insert attempts this page load.
    await reporter.flushSyncErrorUploads();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("never throws even if the client blows up", async () => {
    const { reporter } = await freshModules();
    mocks.getSession.mockRejectedValue(new Error("auth exploded"));
    reporter.enqueueSyncErrorUpload({ at: new Date().toISOString(), table: "t", ids: [], message: "x" });
    await expect(reporter.flushSyncErrorUploads()).resolves.toBeUndefined();
  });
});

describe("initSyncErrorReporter", () => {
  it("forwards appendSyncError entries into the upload queue", async () => {
    const { store, reporter } = await freshModules();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reporter.initSyncErrorReporter();
    store.appendSyncError({ table: "push", ids: ["c1"], message: "denied" });
    expect(outbox(store)).toHaveLength(1);
    expect(outbox(store)[0].message).toBe("denied");
    spy.mockRestore();
  });
});
