

## Wrap Hardcoded User-Facing Strings in t()

### Findings

Scanned all `.tsx` files in `src/pages/` and `src/components/` (excluding `ui/`). Found hardcoded English strings in **5 files**:

**1. `src/pages/SpotifyCallback.tsx`** (3 strings)
- `"Spotify connection failed"` → `t("spotify.connectionFailed")`
- `"Return home"` → `t("spotify.returnHome")`
- `"Connecting to Spotify…"` → `t("spotify.connecting")`
- Also: error messages `"Missing authorization code"`, `"Token exchange failed"`, `"Unknown error"` — these are technical/debug, skip.

**2. `src/components/FeatDetailsDisplay.tsx`** (5 strings, repeated in tooltip + main view)
- `"Description"` → `t("feats.description")`
- `"Prerequisites"` → `t("feats.prerequisites")`
- `"Incompatible with"` → `t("feats.incompatibleWith")`
- `"Special"` → `t("feats.special")`
- Need to add `useTranslation` import + hook call. This component currently has no translation support.

**3. `src/components/WikiLinkedText.tsx`** (5 strings)
- `"Feat not found: "` → `t("feats.notFound")`
- `"Prerequisites"` → `t("feats.prerequisites")`
- `"Incompatible with"` → `t("feats.incompatibleWith")`
- `"Special"` → `t("feats.special")`
- Need to add `useTranslation` import + hook call.

**4. `src/components/ManageFeats.tsx`** (7 strings)
- `"Feats Library"` → `t("adminLegacy.featsLibrary")`
- `" feats"` (in badge) → use existing pattern
- `"Feats are hardcoded in the source code. This is a read-only viewer."` → `t("adminLegacy.featsReadOnly")`
- `"Search feats..."` → `t("adminLegacy.searchFeats")`
- `"Prerequisites:"` → `t("feats.prerequisites")`
- `"Incompatible:"` → `t("feats.incompatible")`
- `"Raw content"` → `t("adminLegacy.rawContent")`
- Need to add `useTranslation` import + hook call.

**5. `src/components/CharacterCreationWizard.tsx`** (1 string)
- `"No feats found."` → `t("feats.noFeatsFound")`

### New i18n Keys

Add to **`src/i18n/en.ts`**:
```
"feats.description": "Description",
"feats.prerequisites": "Prerequisites",
"feats.incompatibleWith": "Incompatible with",
"feats.incompatible": "Incompatible",
"feats.special": "Special",
"feats.notFound": "Feat not found: {name}",
"feats.noFeatsFound": "No feats found.",
"spotify.connectionFailed": "Spotify connection failed",
"spotify.returnHome": "Return home",
"spotify.connecting": "Connecting to Spotify…",
"adminLegacy.featsLibrary": "Feats Library",
"adminLegacy.featsReadOnly": "Feats are hardcoded in the source code. This is a read-only viewer.",
"adminLegacy.searchFeats": "Search feats...",
"adminLegacy.rawContent": "Raw content",
```

Add equivalent keys to **`src/i18n/fr.ts`** with French translations.

### Files to Modify
1. `src/i18n/en.ts` — add ~14 keys
2. `src/i18n/fr.ts` — add ~14 keys (French)
3. `src/pages/SpotifyCallback.tsx` — add useTranslation, wrap 3 strings
4. `src/components/FeatDetailsDisplay.tsx` — add useTranslation, wrap 5 labels (in both tooltip and main component)
5. `src/components/WikiLinkedText.tsx` — add useTranslation, wrap 5 strings
6. `src/components/ManageFeats.tsx` — add useTranslation, wrap 7 strings
7. `src/components/CharacterCreationWizard.tsx` — wrap 1 string (already has useTranslation)

~7 files, straightforward string replacement.

