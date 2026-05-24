## Bug found in testing

After enabling ended-game pulls, "My Characters" shows empty for the GM. Root cause: in `doPull` Phase 4, on a **non-incremental pull** (`merge = setTable`), the character pull runs twice — once for self and once for other users — and the second `setTable("characters", otherChars)` overwrites the self-character rows just written.

This bug existed before but only triggered now because ended games now contribute to `otherUserIds`.

## Fix

In `src/lib/syncManager.ts` Phase 4, aggregate both query results and merge **once**:

```ts
const charResults = await Promise.all(charPulls);
const merged: any[] = [];
for (const res of charResults) {
  if (res?.error) emitSyncError("characters", res.error.message);
  if (res?.data) merged.push(...res.data);
}
if (merged.length > 0 || !isIncremental) merge("characters", merged);
```

This way the initial-pull `setTable` writes the union of self + other characters in a single call.

No other changes.
