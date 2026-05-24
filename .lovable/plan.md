## Two fixes

### 1. Show exhausted/used tag in compact mode

`FeatListItem` already renders the `(exhausted)` / `(used)` tag regardless of `compact`. The bug is plumbing — callers that render in compact mode don't pass `state`/`exhaustionLabel`, so the tag never appears for sub-feats.

Fix the two compact sub-feat call sites to pass through exhaustion state and label:

- `src/components/CharacterDetails.tsx` (subfeats render, line ~182): compute `state` from the subfeat entry (using same `exhausted_at` / `exhausted_scenario_id` / `used_forever` fields if present on the subfeat row) and pass it to `renderFeat`. Today `renderFeat` is called with no `state` for sub-feats.
- `src/components/CharacterFeatPicker.tsx` (subfeats render, line ~559): build `state` + compute `label = exhaustionLabelKind(...)` for the sub-feat's feat and pass `exhaustionLabel={label}` to the compact `FeatListItem`.

Sub-feat entries (`{ slot, feat_id }`) currently don't carry their own exhaustion fields, so tags only display once we widen the type to allow optional `exhausted_at` / `used_forever` on sub-feat rows. I will widen the sub-feat shape (additive, no migration — JSONB) so the wiring works the moment any future code writes exhaustion onto a sub-feat. This unblocks display without changing current write paths.

### 2. Edit-mode Use/Recharge visibility should match detailed view

`src/components/CharacterFeatPicker.tsx` lines 733-734 and 792-793 unconditionally pass `onRecharge` whenever `exhaustion !== "infinite"`, so Recharge is always visible in edit mode. Align with `CharacterDetails`:

- `onUse`: keep `exhaustion !== "infinite"` (unchanged).
- `onRecharge`: only when `exhausted && exhaustion !== "transforms_on_use"`.

Also fix `useFeat` (line 199) to handle `transforms_on_use`: when triggered, swap the entry's `feat_id` to `meta.transforms_to` and reset exhaustion state — same behavior as the detailed view. Without this, clicking Use on a transforms-on-use feat in edit mode would falsely mark it exhausted instead of transforming. `setExhaustionForLevel` already accepts a partial patch so `{ feat_id: newId, exhausted_at: null, exhausted_scenario_id: null, used_forever: false }` works directly.

## Files touched

- `src/components/CharacterDetails.tsx` — pass `state` in the compact sub-feat `renderFeat` call.
- `src/components/CharacterFeatPicker.tsx` — pass `exhaustionLabel` to compact sub-feat `FeatListItem`; tighten `onRecharge` visibility; add `transforms_on_use` swap to `useFeat`.
