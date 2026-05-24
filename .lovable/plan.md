## Diagnosis

Data is correct — all 42 prowesses have an `exhaustion` value (41 = `once_per_scenario`, 1 = `once_forever`), and Faith / Dark Faith / Whispers of Madness / Abuse of Power all have the right meta.

The bug is rendering: when these feats sit as **subfeats under an Archetype** (Aristocrat's Faith slot, Wiki Contributor's Dark Faith slot, etc.), both `CharacterDetails.tsx` and `CharacterFeatPicker.tsx` render them with `compact: true`. `FeatListItem` then hides Use and Recharge unconditionally for any compact row:

```tsx
{!compact && onUse && !exhaustionLabel && <Use />}
{!compact && onRecharge && <Recharge />}
```

So the buttons disappear, even though the underlying exhaustion state is wired up.

## Fix

Subfeats should get the buttons, but other compact contexts (e.g. compact character-sheet previews on the dashboard, the GM player list, etc.) must stay button-less. So I won't strip the `!compact` guard — I'll let the caller opt in.

1. **`src/components/FeatListItem.tsx`** — keep the `compact` prop's visual role (padding, density), but stop using it to gate Use/Recharge. Instead show those buttons whenever `onUse` / `onRecharge` are passed. Other compact callers already pass `undefined` for both, so they stay unchanged.

2. **`src/components/CharacterDetails.tsx`** — in the subfeats loop (around line 195–206), pass `onUse` and `onRecharge` handlers for each subfeat. They patch the parent feat's `subfeats[]` array at the matching slot via a new `updateSubfeatState(docIndex, slot, patch)` helper that mirrors `updateEntry` but targets the nested entry. Keep `compact: true` so the row stays dense.

3. **`src/components/CharacterFeatPicker.tsx`** — in `renderSubfeats` (around line 585), do the same: pass `onUse` / `onRecharge` that persist per-subfeat state. The per-subfeat columns (`exhausted_at`, `exhausted_scenario_id`, `used_forever`) already exist on `character_feat_subfeats` and on the embedded `subfeats[]` entries.

4. **Audit other compact callers** (`CharacterListItem`, dashboard previews, GM player list, etc.) — they already pass no `onUse`/`onRecharge`, so they keep showing no buttons. I'll grep to confirm before finishing.

## Verification

- Open a character whose Archetype has Faith / Dark Faith / Whispers of Madness slotted. Confirm Use flips the tag to `(exhausted)`, Recharge clears it, both on read-only Details and in the Edit picker.
- Reload the compact character cards on the dashboard and GM player list to confirm no Use/Recharge buttons appear there.
- Re-test at 970-wide desktop and at mobile width — buttons stay tappable in the tight subfeat row.
