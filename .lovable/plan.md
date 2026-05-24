## Diagnosis

I tested it and confirmed the bug. `CharacterListItem.tsx` (the compact character card shown on the home page) renders feats as a bullet list but **never reads exhaustion state at all**. It only pulls `feat_id` and `subfeats[].feat_id` from `charRow.feats`, dropping `exhausted_at` / `used_forever` / `exhausted_scenario_id`. So even when "Abuse of Power" is exhausted in the detailed view, the compact card still shows just "Abuse of Power".

The detailed view in `CharacterDetails.tsx` computes the label like this (lines 91-96):

```ts
const exhaustion = getFeatExhaustion(feat);
const exhausted = isFeatExhausted(state, exhaustion, scenarioHistory);
const labelKind = exhaustionLabelKind(state, exhaustion, exhausted); // "exhausted" | "used" | null
```

…using `scenarioHistory` from `useUserScenarioHistory(char?.user_id)`.

## Fix

Edit `src/components/CharacterListItem.tsx` only:

1. Import `useUserScenarioHistory`, `getFeatExhaustion`, `getFeatMeta`, `isFeatExhausted`, `exhaustionLabelKind`.
2. Pull `scenarioHistory` from `useUserScenarioHistory(charRow?.user_id)`.
3. Widen the `feats` memo to preserve exhaustion fields on both feats and subfeats:
   ```ts
   { feat_id, subfeats, exhausted_at, exhausted_scenario_id, used_forever }
   ```
4. For each top-level feat and each subfeat, compute `labelKind` using the same helpers, and render the tag inline after the title:
   ```tsx
   {labelKind && (
     <span className="ml-1 italic text-destructive/80">
       ({labelKind === "used" ? t("feats.usedTag") : t("feats.exhaustedTag")})
     </span>
   )}
   ```
5. Apply `opacity-70` to the `<li>` when `labelKind` is set, matching `FeatListItem`'s visual treatment.

No other files touched. Translation keys `feats.exhaustedTag` and `feats.usedTag` already exist (used by `FeatListItem`).
