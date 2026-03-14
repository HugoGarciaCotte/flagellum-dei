

## Why scenario descriptions are missing from the translation panel

The `showcaseScenarios` array in `Home.tsx` (lines 139-161) contains **hardcoded strings** for `title`, `description`, and `date`. They are passed directly to `ScenarioCard` without going through `t()`. Since they don't exist as keys in `en.ts`, they never appear in the translation admin panel.

The same issue could affect any other text added directly as JSX strings rather than via `t()` keys.

## Plan: Move showcase scenario text into translation keys

### 1. Add keys to `src/i18n/en.ts`

Add 9 new keys for the 3 showcase scenarios:

```
home.scenarios.s1.title = "Societas Templois"
home.scenarios.s1.desc  = "A string of mysterious deaths..."
home.scenarios.s1.date  = "11th of December, 1344"
home.scenarios.s2.title = "Flagellum Dei"
home.scenarios.s2.desc  = "The streets of Marseille lie silent..."
home.scenarios.s2.date  = "Christmas Eve, 1347"
home.scenarios.s3.title = "The Mad King"
home.scenarios.s3.desc  = "Lost in the wastes of the Arabian desert..."
home.scenarios.s3.date  = "6th of October, 1241"
```

Note: scenario proper names (Societas Templois, Flagellum Dei, The Mad King) are kept as-is per translation rules, but having them as keys lets translators adapt phrasing if needed.

### 2. Update `src/pages/Home.tsx`

Replace the hardcoded `showcaseScenarios` array. Move it inside the `Home` component so it can use `t()`:

```ts
const displayScenarios = [
  { title: t("home.scenarios.s1.title"), description: t("home.scenarios.s1.desc"), level: 1, date: t("home.scenarios.s1.date") },
  { title: t("home.scenarios.s2.title"), description: t("home.scenarios.s2.desc"), level: 5, date: t("home.scenarios.s2.date") },
  { title: t("home.scenarios.s3.title"), description: t("home.scenarios.s3.desc"), level: 9, date: t("home.scenarios.s3.date") },
];
```

### 3. Update `src/i18n/fr.ts`

Add the 9 new keys with French translations (can be generated via the AI translation tool after merging).

---

### Ensuring completeness going forward

This is a one-time cleanup. The rule is simple: **every user-visible string must use `t()`**. After this change, all landing page text will flow through the translation system and appear in the admin panel. Any future text added as raw strings will be missing from translations — this is a discipline issue, not a systemic one. The admin panel's "missing" counter already flags keys present in `en.ts` but not translated, which is sufficient.

