## Goal

Add a new feat usage type "Transforms on Use": clicking Use replaces the feat with another feat (the next stage). No recharge button. After the last stage (plain `infinite`) the feat is no longer usable. Sub-feats are preserved across the transformation (only the top-level `feat_id` changes; the `subfeats` array on the entry stays as-is).

Then pre-program all Bone Item chains found in the feat data.

## New usage type

Add `"transforms_on_use"` to `ExhaustionType` in `src/data/feats.ts` and `EXHAUSTION_TYPES`. Add a new optional field on `FeatMeta`:

- `transforms_to?: string` — id of the feat this one becomes when used.

Behavior:

- `isFeatExhausted` and `exhaustionLabelKind` treat `transforms_on_use` like `infinite` (no `(exhausted)` label, never marked exhausted).
- In `CharacterDetails.tsx` `onUse`, if `exhaustion === "transforms_on_use"` and `meta.transforms_to` is set, replace the entry's `feat_id` with the target id and clear `exhausted_at` / `exhausted_scenario_id` / `used_forever`. **The entry's `subfeats` array is left untouched** — sub-feats survive the transformation.
- In `renderFeat`, Use button shows whenever `exhaustion !== "infinite"` (already true). Recharge button must never appear for `transforms_on_use` — add that exclusion explicitly.
- Sub-feat rendering is `compact: true` and already passes neither `onUse` nor `onRecharge`, so sub-feats never trigger their own transformation from the character view — confirmed safe.
- i18n: add `adminFeats.exhaustion.transforms_on_use` ("Transforms on Use" / "Se transforme à l'usage") and a label for the picker (`adminFeats.fieldTransformsTo`).

## Feat editor UI

In `FeatEditorPanel.tsx`:

- Add `"transforms_to"` to `META_FIELDS`.
- When the selected exhaustion is `transforms_on_use`, render a "Transforms into" field below the exhaustion dropdown — a `Select` listing all feats by title, saving the chosen feat's id into `meta.transforms_to`. Hidden for other exhaustion types.

## Bone Item chains to pre-program

In `src/data/feats-data.json`, for each chain set `meta.exhaustion` and `meta.transforms_to`:

| Chain | base → used once → used twice → used three times |
|---|---|
| Bone Chesspiece, Bone Chest, Bone Coin, Bone Harp, Bone Ring, Bone Rondel, Bone Sickle, Bone Sword, Bone Triptych, Bone Warhorn | All four stages exist. Wire `base → used once → used twice → used three times`, last stage stays `infinite`. |
| Bone Dice | Only `base` and `used once` exist. Wire `Bone Dice → Bone Dice (used once)`; `Bone Dice (used once)` is terminal (`infinite`). |

I'll do this with a small Node script that loads the JSON, resolves ids by title within each chain, writes the file back, and reports any unresolved links. `Template:Bone Artifacts` is left alone.

## Files touched

- `src/data/feats.ts` — add type, `EXHAUSTION_TYPES` entry, `transforms_to` on `FeatMeta`.
- `src/lib/featExhaustion.ts` — treat `transforms_on_use` as never exhausted.
- `src/components/CharacterDetails.tsx` — `onUse` swaps `feat_id` (subfeats untouched); never pass `onRecharge` for this type.
- `src/components/FeatEditorPanel.tsx` — add `transforms_to` picker shown only when exhaustion is `transforms_on_use`.
- `src/i18n/en.ts` + `src/i18n/fr.ts` — new exhaustion label + picker label.
- `src/data/feats-data.json` — set `meta.exhaustion` + `meta.transforms_to` on all Bone Item entries per the table above.
