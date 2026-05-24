## Problem

Clicking **Use** on a feat in the dashboard's detailed view does nothing — Use button stays, no `(exhausted)` tag appears.

DB inspection shows your "Test" character has Abuse of Power as `{ level: 1, is_free: false }`, so it should render top-level with the Use button. The wiring through `CharacterDetails → updateEntry → upsertRow → useLocalRow` looks correct on paper, yet nothing changes — meaning either the click isn't reaching `onUse`, or `updateEntry` is no-op'ing, or the re-render isn't happening.

## Approach

1. **Instrument** the click path with temporary `console.log` calls:
   - In `CharacterDetails.tsx` `onUse`: log the feat id, the `matchSelf` candidates, the computed patch.
   - In `localStore.upsertRow`: log table + id + which keys changed.
   - In `useLocalRow`: log when the change event triggers a re-fetch.

2. **Reproduce** the click on Abuse of Power in the Test character's detail dialog, read console logs, identify the broken link.

3. **Fix the root cause.** Most likely suspects, in order of probability:
   - **`matchSelf` predicate never matches** because `char.feats` doc entries don't carry the exact shape the mapped `f` expects (e.g. `is_free` undefined vs `false`). Fix by relaxing the predicate to compare on `feat_id + level + !!is_free`, or by indexing on a stable position rather than predicate matching.
   - **Stale closure** — `matchSelf` captures `f` from the mapped array, but if `feats.map` reorders, the index in the original doc no longer aligns. Fix by capturing the doc-index directly when building the mapped `feats` list and using it in `updateEntry` instead of a predicate.
   - **Re-render not firing** — possible if `upsertRow` merges into the same object ref. Fix by always producing a fresh row object.

4. **Remove the debug logs** once the cause is confirmed and fixed.

5. **Verify** by clicking Use → expect `(exhausted)` tag to appear next to "Abuse of Power", Use button to disappear, Recharge button to appear. Then click Recharge → expect tag to disappear, Use to return.

## Out of scope

- Subfeat Use buttons: in two of your characters Abuse of Power is a slot-3 subfeat. Subfeats render compact and intentionally have no Use button. If you also want Use/Recharge on subfeats, say so and I'll add it as a follow-up.
- Visual styling of the `(exhausted)` tag.

## Files likely touched

- `src/components/CharacterDetails.tsx` — fix `updateEntry` / `matchSelf` indexing.
- Possibly `src/lib/localStore.ts` — only if the re-render path turns out to be the culprit.
