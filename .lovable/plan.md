

## Plan: Import translations into `fr.ts`

The uploaded `translations.json` contains 69 French translations. These need to be merged into `src/i18n/fr.ts` so they become the static language file (no longer DB-only).

### Change

**`src/i18n/fr.ts`** — Replace the current file (which just copies `en`) with one that spreads `en` as defaults, then overrides with all 69 translated keys from the uploaded JSON.

Structure:
```ts
import en from "./en";

const fr: Record<string, string> = {
  ...en,
  "home.hero.meta": "Accès libre · Pour 3 à 9 joueurs · ...",
  // ... all 69 keys from the JSON
};

export default fr;
```

All keys and values taken verbatim from the uploaded file.

