

## Fix: Realtime Updates Not Reaching Player

**Root cause**: When the realtime subscription fires (GM updates `current_section`), both `HostGame` and `PlayGame` call `pullAll()` **without a userId**. In `doPull(undefined)`, only `user_roles` is fetched — the game data is never refreshed. So the player never sees the section change (and thus the background change).

Meanwhile, `pushAll()` correctly uses `_currentUserId` as fallback, but `pullAll()` ignores it.

### Fix

**`src/lib/syncManager.ts`** — line 201 in `pullAll`:

```typescript
export async function pullAll(userId?: string): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPull(userId ?? _currentUserId);  // ← use stored userId as fallback
  } catch (e) {
    console.warn("Pull failed:", e);
  } finally {
    _syncing = false;
    notify("synced");
  }
}
```

Single-line change. This ensures every realtime-triggered `pullAll()` call actually fetches game data, player data, and everything else — not just `user_roles`.

