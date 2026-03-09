

## Fix Speciality Detection: Require Parenthesized Form + Filter Real Feats

### Problem
The AI sometimes proposes specialities for feats that don't use parenthesized variants, and also proposes specialities like "medicine" for "Knowledge" when "Knowledge (medicine)" is actually a standalone feat.

### Rules to enforce
1. A speciality **must** correspond to a parenthesized variant: `"{Title} ({option})"`. No parenthesis pattern = no specialities.
2. If `"{Title} ({option})"` exists as a standalone feat in the DB, it's a subfeat, not a speciality.

### Changes

#### 1. `supabase/functions/regenerate-description/index.ts` — `generateSpecialities` (line 223)

- Add `allFeatTitles: string[]` parameter.
- Update the system prompt to explain both rules:
  - Specialities ONLY exist when the wiki content shows the feat used with parenthesized variants like `"{Title} ({option})"`.
  - If no parenthesized pattern exists in the content, return empty array.
  - Exclude any option where `"{Title} ({option})"` is an existing feat title.
  - Provide `allFeatTitles` in the prompt for reference.
- Add post-processing filter after parsing AI results (~line 258): remove any speciality `s` where `allFeatTitles` includes `"{title} ({s})"` (case-insensitive).

#### 2. Update call site (line 421)

Pass `allFeatTitles` to `generateSpecialities`:
```
generateSpecialities(feat.title, cleanContent, feat.categories || [], allFeatTitles),
```

#### 3. `supabase/functions/check-feats-ai/index.ts` — system prompt (line 90)

Update specialities description:
```
- specialities: Options where the feat is used as "{Title} ({option})". ONLY valid if parenthesized variants exist in the wiki content AND "{Title} ({option})" is NOT a standalone feat in the database. Most feats have none.
```

