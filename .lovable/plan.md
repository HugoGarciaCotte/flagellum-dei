

## Plan: Add "pending export" counter to translation admin

### What

Next to the existing missing-count banner, show how many keys are translated in the DB but still identical to English in the hardcoded `fr.ts` file — i.e., translations that exist only in the DB and would be lost if the DB were cleared without downloading first.

### How

**`src/pages/AdminTranslations.tsx`**:

1. Import `fr` from `@/i18n/fr`.
2. Add a `pendingExportCount` memo: count keys where `dbTranslations[key]` exists, differs from `en[key]`, AND `fr[key]` is either missing or still equals `en[key]`.
3. Below the existing missing banner, add a second amber/warning banner:
   ```
   ⚠ {pendingExportCount} translation(s) exist only in the database — download & export to preserve them in the static language file.
   ```
   Only shown when `pendingExportCount > 0`.

