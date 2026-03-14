

## Plan: Fix "missing" logic + Add copyable audit prompt

You're right — no point installing a plugin we can't run. Drop the ESLint plugin entirely. Two changes only:

### 1. Fix "missing" logic in `AdminTranslations.tsx`

Currently a key is flagged "MISSING" if the DB has no value, even when `fr.ts` already has a proper translation. Fix all three checks to account for static translations:

```ts
// Import static fr as staticFr (already imported as fr, rename to avoid confusion)
import staticFr from "@/i18n/fr";

// A key is truly missing only if NEITHER DB nor static file has a translation
const isMissing = (!editValues[key] || editValues[key] === en[key]) 
               && (!staticFr[key] || staticFr[key] === en[key]);
```

Apply to: `missingCount` (line 71), `screenMissing` (line 250), per-key `isMissing` (line 265).

### 2. Add copyable Lovable audit prompt

Add a collapsible card below the action bar with a pre-written prompt the admin can copy-paste into Lovable chat. The prompt asks Lovable to use `search_files` to find hardcoded strings and fix them:

> "Scan all .tsx files in src/pages/ and src/components/ (excluding src/components/ui/) for hardcoded user-facing text in JSX that is not wrapped in the t() translation function. Use search_files to find patterns like >Some English text< in JSX and string props like title=, description=, placeholder=, label= with literal values. For each hardcoded string found: 1) Add a new key to src/i18n/en.ts following the existing naming convention (screen.section.purpose), 2) Replace the hardcoded string with t('new.key') in the component. Skip className, variant, size, type, key, data-*, src, href attributes. Skip strings that are purely technical (e.g. channel names, event types)."

Includes a copy-to-clipboard button with toast feedback.

### Files
- `src/pages/AdminTranslations.tsx` — fix missing logic + add prompt card

