

## Remove AI Validation from Feat Picking — Use Programmatic Checks

### What Changes

Replace the AI-based `validate-feat` edge function call in `CharacterFeatPicker.tsx` with purely programmatic prerequisite and blocking checks using the already-parsed `EmbeddedFeatMeta` data (which is already computed in `metaMap`).

### How It Works

**Prerequisites** (`feat_prerequisites`) is a free-form string like `"[Prowess A], Level 3"` or `"[Combat], [Strength]"`. We parse feat titles from it (anything in square brackets or matching known feat titles) and check if the character owns them. Level requirements are checked against the target level.

**Blocking** (`feat_blocking`) is already handled in the `filteredFeats` filter (lines 463-477) — blocked feats are hidden from the picker entirely. This stays as-is.

### Files to Change

#### 1. `src/components/CharacterFeatPicker.tsx`
- **Remove** the `validate-feat` edge function call from `upsertMutation` (lines 142-155)
- **Remove** the `validatingFeat` state (line 70) and any loading UI tied to it
- **Add** a `validateFeatLocally(featId, level)` function that:
  1. Gets the target feat's `meta.prerequisites` string
  2. If no prerequisites → allowed
  3. Extracts referenced feat titles by matching against known feat titles in `featByTitle`
  4. Checks each referenced feat exists in `characterFeats`
  5. If any missing → throws with a message listing missing feats
  6. Also checks blocking (redundant with filter, but safety net)
- Call `validateFeatLocally` at the start of `upsertMutation.mutationFn` instead of the edge function call
- This is fully synchronous — no network call, no loading spinner needed

#### 2. `supabase/functions/validate-feat/index.ts`
- Keep the file (it's still useful for GM tools or future server-side validation), but the player-facing feat picker no longer calls it

### No other files change — the filtering already hides blocked feats, and the prerequisite metadata is already parsed and available in `metaMap`.

