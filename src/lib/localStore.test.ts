/**
 * Unit tests for SYNC-01..07, SYNC-14, quarantine (§5.2), and AUTH-01
 * behaviors exposed by localStore.
 *
 * Each test re-imports the module fresh so its top-level cache
 * hydrates from a freshly-seeded localStorage.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

async function freshStore(seed: Record<string, unknown> = {}) {
  localStorage.clear();
  for (const [k, v] of Object.entries(seed)) {
    localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  vi.resetModules();
  return await import("./localStore");
}

beforeEach(() => {
  localStorage.clear();
});

describe("SYNC-01: dirty set is persisted", () => {
  it("persists dirty markers across reloads", async () => {
    let store = await freshStore();
    store.upsertRow("characters", { id: "c1", name: "Alice" });
    expect(store.getDirtyRows()).toEqual([{ table: "characters", id: "c1" }]);

    // Simulate reload — re-import with existing localStorage.
    vi.resetModules();
    store = await import("./localStore");
    expect(store.getDirtyRows()).toEqual([{ table: "characters", id: "c1" }]);
  });

  it("clearDirtyFor removes only the specified rows and their outbox meta", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1" });
    store.upsertRow("characters", { id: "c2" });
    store.clearDirtyFor([{ table: "characters", id: "c1" }]);
    expect(store.getDirtyRows()).toEqual([{ table: "characters", id: "c2" }]);
    expect(store.getOutboxMeta("characters", "c1")).toBeUndefined();
    expect(store.getOutboxMeta("characters", "c2")).toBeDefined();
  });
});

describe("SYNC-02: dirty rows always win over incoming snapshots", () => {
  it("setTableKeepDirty preserves the local dirty row", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1", name: "Local edit" });
    store.setTableKeepDirty("characters", [
      { id: "c1", name: "Server stale" },
      { id: "c2", name: "New from server" },
    ]);
    const rows = store.getTable<{ id: string; name: string }>("characters");
    expect(rows.find((r) => r.id === "c1")?.name).toBe("Local edit");
    expect(rows.find((r) => r.id === "c2")?.name).toBe("New from server");
  });

  it("mergeTable skips incoming rows that are locally dirty", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1", name: "Local" });
    store.mergeTable("characters", [{ id: "c1", name: "Server" }]);
    expect(store.getRow<{ name: string }>("characters", "c1")?.name).toBe("Local");
  });

  it("replaceBy keeps in-scope dirty rows and drops in-scope clean rows", async () => {
    const store = await freshStore();
    // Seed a clean row to be replaced.
    store.mergeCleanRow("characters", { id: "clean", user_id: "u1", name: "Old" });
    // Dirty row in the same scope that must survive replacement.
    store.upsertRow("characters", { id: "dirty", user_id: "u1", name: "MyEdit" });
    // Out-of-scope row that must survive replacement.
    store.mergeCleanRow("characters", { id: "other", user_id: "u2", name: "Untouched" });

    store.replaceBy("characters", { user_id: "u1" }, [
      { id: "fresh", user_id: "u1", name: "Fresh" },
    ]);

    const ids = store.getTable<{ id: string }>("characters").map((r) => r.id).sort();
    expect(ids).toEqual(["dirty", "fresh", "other"]);
    expect(store.getRow<{ name: string }>("characters", "dirty")?.name).toBe("MyEdit");
  });
});

describe("SYNC-07: mergeCleanRow does not mark dirty", () => {
  it("keeps the dirty set empty for server-authored rows", async () => {
    const store = await freshStore();
    store.mergeCleanRow("characters", { id: "server-1", name: "From server" });
    expect(store.getDirtyRows()).toEqual([]);
    expect(store.getOutboxMeta("characters", "server-1")).toBeUndefined();
  });
});

describe("§5.1: outbox metadata", () => {
  it("noteEnqueued starts attempts at 0; noteAttempt increments and records error", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1" }); // enqueue via write
    let meta = store.getOutboxMeta("characters", "c1")!;
    expect(meta.attempts).toBe(0);

    store.noteAttempt("characters", "c1", Date.now() + 5000, { code: "500", message: "boom" });
    meta = store.getOutboxMeta("characters", "c1")!;
    expect(meta.attempts).toBe(1);
    expect(meta.lastError?.message).toBe("boom");
    expect(meta.nextAttemptAt).toBeGreaterThan(Date.now());
  });
});

describe("§5.2: quarantine store", () => {
  it("quarantineRow parks the row, clears the dirty marker, and emits a sync error", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1", name: "Broken" });

    const ok = store.quarantineRow("characters", "c1", "rls-rejected", { message: "denied" });
    expect(ok).toBe(true);
    expect(store.getDirtyRows()).toEqual([]);
    const q = store.getQuarantine();
    expect(q).toHaveLength(1);
    expect(q[0].reason).toBe("rls-rejected");
    expect(q[0].row.name).toBe("Broken");
    expect(store.getSyncErrors()[0].message).toMatch(/parked/i);
  });

  it("retryQuarantined re-injects the row as dirty and resets attempts", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1", name: "Broken" });
    store.noteAttempt("characters", "c1", Date.now() + 1000, { message: "x" });
    store.quarantineRow("characters", "c1", "terminal-error", { message: "x" });

    const [entry] = store.getQuarantine();
    store.retryQuarantined(entry.key);

    expect(store.getQuarantine()).toHaveLength(0);
    expect(store.getDirtyRows()).toEqual([{ table: "characters", id: "c1" }]);
    const meta = store.getOutboxMeta("characters", "c1")!;
    expect(meta.attempts).toBe(0);
    expect(meta.lastError).toBeUndefined();
  });

  it("discardQuarantined removes the entry without re-queuing it", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1" });
    store.quarantineRow("characters", "c1", "conflict");
    const [entry] = store.getQuarantine();

    store.discardQuarantined(entry.key);
    expect(store.getQuarantine()).toHaveLength(0);
    expect(store.getDirtyRows()).toEqual([]);
  });

  it("quarantine survives a reload", async () => {
    let store = await freshStore();
    store.upsertRow("characters", { id: "c1" });
    store.quarantineRow("characters", "c1", "max-attempts");

    vi.resetModules();
    store = await import("./localStore");
    expect(store.getQuarantine()).toHaveLength(1);
  });
});

describe("soft delete + ST-08 ghost cleanup", () => {
  it("softDeleteRow hides the row from getTable and marks it dirty", async () => {
    const store = await freshStore();
    store.mergeCleanRow("characters", { id: "c1", name: "x" });
    store.softDeleteRow("characters", "c1");
    expect(store.getTable("characters")).toHaveLength(0);
    expect(store.getDirtyRows()).toEqual([{ table: "characters", id: "c1" }]);
  });

  it("deleteRow drops any lingering dirty marker (ST-08)", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1" });
    expect(store.getDirtyRows()).toHaveLength(1);
    store.deleteRow("characters", "c1");
    expect(store.getDirtyRows()).toEqual([]);
    expect(store.getOutboxMeta("characters", "c1")).toBeUndefined();
  });
});

describe("AUTH-01: reassignLocalUser rehomes local-guest rows", () => {
  it("rewrites user_id / host_user_id and marks rows dirty", async () => {
    const store = await freshStore();
    store.mergeCleanRow("characters", { id: "c1", user_id: "guest" });
    store.mergeCleanRow("games", { id: "g1", host_user_id: "guest" });
    expect(store.getDirtyRows()).toEqual([]);

    store.reassignLocalUser("guest", "real-uid");

    expect(store.getRow<{ user_id: string }>("characters", "c1")?.user_id).toBe("real-uid");
    expect(store.getRow<{ host_user_id: string }>("games", "g1")?.host_user_id).toBe("real-uid");
    const dirty = store.getDirtyRows().map((d) => `${d.table}:${d.id}`).sort();
    expect(dirty).toEqual(["characters:c1", "games:g1"]);
  });

  it("no-ops when ids are equal or empty", async () => {
    const store = await freshStore();
    store.mergeCleanRow("characters", { id: "c1", user_id: "u" });
    store.reassignLocalUser("u", "u");
    store.reassignLocalUser("", "u");
    expect(store.getDirtyRows()).toEqual([]);
  });
});

describe("clearAll", () => {
  it("empties every table, dirty set, and outbox metadata", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1" });
    store.clearAll();
    expect(store.getTable("characters")).toEqual([]);
    expect(store.getDirtyRows()).toEqual([]);
    expect(store.getLastSync()).toBeNull();
  });
});

describe("corrupt-blob recovery", () => {
  it("preserves the corrupt payload under ls_corrupt_* instead of throwing", async () => {
    const store = await freshStore({ ls_characters: "{not json" });
    expect(store.getTable("characters")).toEqual([]);
    const corruptKey = Object.keys(localStorage).find((k) => k.startsWith("ls_corrupt_characters_"));
    expect(corruptKey).toBeDefined();
    expect(localStorage.getItem(corruptKey!)).toBe("{not json");
  });
});

describe("journal ring buffer (§6.1)", () => {
  it("caps entries and stores newest first", async () => {
    const store = await freshStore();
    for (let i = 0; i < 5; i++) store.journal({ op: "push", table: "characters", ids: [String(i)], ok: true });
    const entries = store.getJournal();
    expect(entries[0].ids).toEqual(["4"]);
    expect(entries).toHaveLength(5);
  });
});

describe("A-01: shouldClearOnUserChange", () => {
  it("only fires for two distinct non-null user ids", async () => {
    const store = await freshStore();
    expect(store.shouldClearOnUserChange("A", undefined)).toBe(false);
    expect(store.shouldClearOnUserChange(undefined, "A")).toBe(false);
    expect(store.shouldClearOnUserChange(undefined, undefined)).toBe(false);
    expect(store.shouldClearOnUserChange("A", "A")).toBe(false);
    expect(store.shouldClearOnUserChange("A", "B")).toBe(true);
  });
});

describe("B-14: deleteBy clears dirty markers", () => {
  it("removes dirty markers and outbox meta for deleted rows", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1", user_id: "u1", name: "A" });
    store.upsertRow("characters", { id: "c2", user_id: "u1", name: "B" });
    store.upsertRow("characters", { id: "c3", user_id: "u2", name: "C" });
    expect(store.getDirtyRows()).toHaveLength(3);
    store.deleteBy("characters", { user_id: "u1" });
    const dirty = store.getDirtyRows();
    expect(dirty.map((r) => r.id).sort()).toEqual(["c3"]);
    expect(store.getOutboxMeta("characters", "c1")).toBeUndefined();
    expect(store.getOutboxMeta("characters", "c2")).toBeUndefined();
  });
});

describe("B-15: clearAll wipes sync errors and quarantine", () => {
  it("removes parked entries and error log alongside tables", async () => {
    const store = await freshStore();
    store.upsertRow("characters", { id: "c1", user_id: "u1", name: "A" });
    store.quarantineRow("characters", "c1", "terminal-error", { message: "nope" });
    expect(store.getQuarantine().length).toBeGreaterThan(0);
    expect(store.getSyncErrors().length).toBeGreaterThan(0);
    store.clearAll();
    expect(store.getQuarantine()).toHaveLength(0);
    expect(store.getSyncErrors()).toHaveLength(0);
    expect(store.getTable("characters")).toHaveLength(0);
  });
});

describe("B-01: noteDeferred defers without incrementing attempts", () => {
  it("keeps attempts at 0 across many connectivity failures", async () => {
    const store = await freshStore();
    store.noteEnqueued("characters", "c1");
    for (let i = 0; i < 20; i++) {
      store.noteDeferred("characters", "c1", Date.now() + 30_000, { message: "Failed to fetch" });
    }
    const meta = store.getOutboxMeta("characters", "c1");
    expect(meta?.attempts).toBe(0);
    expect(meta?.nextAttemptAt).toBeGreaterThan(Date.now());
    expect(store.getQuarantine()).toHaveLength(0);
  });
});

describe("B-13: quarantine cap → caller can back off", () => {
  it("quarantineRow eventually returns false so caller falls back to noteAttempt", async () => {
    const store = await freshStore();
    // Seed 200 rows so quarantineRow actually pushes entries (cap=100).
    for (let i = 0; i < 200; i++) {
      store.upsertRow("characters", { id: `c${i}`, user_id: "u1", name: `n${i}` });
    }
    let parkedFalseSeen = false;
    for (let i = 0; i < 200; i++) {
      const parked = store.quarantineRow("characters", `c${i}`, "terminal-error", { message: "e" });
      if (!parked) {
        parkedFalseSeen = true;
        store.noteAttempt("characters", `c${i}`, Date.now() + 30_000, { message: "e" });
        const m = store.getOutboxMeta("characters", `c${i}`);
        expect(m?.nextAttemptAt).toBeGreaterThan(Date.now());
        break;
      }
    }
    expect(parkedFalseSeen).toBe(true);
  });
});
