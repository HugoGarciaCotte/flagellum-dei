

## Add Blocking Feats as a Parseable Field

Add `feat_blocking` as a new embedded parseable field following the exact same pattern as `feat_specialities` — a comma-separated list of feat titles that are incompatible with this feat.

**Tag format:** `<!--@ feat_blocking: Combat, Warfare @-->`

### Files to Change

#### 1. `src/lib/parseEmbeddedFeatMeta.ts`
- Add `blocking: string[] | null` to `EmbeddedFeatMeta`
- Parse `feat_blocking` key (comma-separated list, same as `feat_specialities`)
- Add `blocking` param to `generateParseableBlock` and emit `<!--@ feat_blocking: ... @-->` line

#### 2. `src/components/ManageFeats.tsx`
- Add `hasBlocking` helper
- Add blocking icon in feat row (e.g. `Ban` from lucide)
- Display blocking list in expanded detail view

#### 3. Edge functions (all have duplicated parser/generator):

**`supabase/functions/regenerate-description/index.ts`**
- Add `blocking` to interface, parser, generator
- Add `generateBlocking()` AI function that identifies incompatible feats from wiki content
- Call it in `regenerate_all` alongside other fields

**`supabase/functions/check-feats-ai/index.ts`**
- Add `blocking` to interface, parser, AI prompt fields list, and tool schema enum

**`supabase/functions/push-wiki-feats/index.ts`**
- Add `blocking` to interface, parser, generator

**`supabase/functions/validate-feat/index.ts`**
- Extract blocking from embedded meta and include in AI validation prompt

#### 4. `src/components/FeatDetailsDisplay.tsx` & `src/components/WikiLinkedText.tsx`
- Display blocking feats in hover/detail views when present

#### 5. `src/components/CharacterFeatPicker.tsx`
- Use blocking list to warn or prevent picking incompatible feats when a blocking feat is already selected

