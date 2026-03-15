

## Fix: Align "Generate All" with `isTrulyMissing`

**Problem**: `handleGenerateAll` (line 133) uses `!editValues[k] || editValues[k] === en[k]` which doesn't check `staticFr`. This means it will re-generate keys that already have a proper French translation in the static `fr.ts` file.

**Fix**: One line change in `src/pages/AdminTranslations.tsx` line 133:

```typescript
// Before:
const missing = allKeys.filter((k) => !editValues[k] || editValues[k] === en[k]);

// After:
const missing = allKeys.filter(isTrulyMissing);
```

This reuses the existing `isTrulyMissing` function which correctly checks both DB values and static `fr.ts` translations, making "Generate All" consistent with the missing count badge.

1 file, 1 line change.

