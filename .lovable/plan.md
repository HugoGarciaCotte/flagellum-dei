## Fix

In `src/components/CharacterListItem.tsx`, the `renderTag` helper wraps the i18n string in `(…)` but the strings `feats.exhaustedTag` / `feats.usedTag` already contain their own parentheses (`(exhausted)`, `(épuisé)`, etc.). Remove the literal parens:

```tsx
const renderTag = (kind: "used" | "exhausted" | null) =>
  kind ? (
    <span className="ml-1 italic text-destructive/80">
      {kind === "used" ? t("feats.usedTag") : t("feats.exhaustedTag")}
    </span>
  ) : null;
```

Single file change. After applying I'll open the preview and verify the compact card shows `(exhausted)` instead of `((exhausted))`.
