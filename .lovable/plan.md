

## Move Edit/Delete into a three-dot dropdown menu

**Problem:** Edit and Delete buttons sit directly in the feat row alongside Info, cluttering the UI for actions that are rarely used.

**Solution:** Replace the inline Edit + Delete buttons with a single `MoreVertical` (⋮) dropdown menu. The Info button stays as a direct button since it's the most-used action.

### Changes

**`src/components/CharacterFeatPicker.tsx`** (lines 577-591, and line 626-635)

For level feats (lines 577-591), replace the inline Edit + Delete `<>...</>` actions block with a `DropdownMenu` containing Edit and Delete as menu items:

```tsx
actions={
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
        <MoreVertical className="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => openPicker({ type: "level", level })}>
        {t("feats.edit")}
      </DropdownMenuItem>
      <DropdownMenuItem className="text-destructive" onClick={() => deleteFeat(level, false)}>
        {t("feats.delete")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}
```

For free feats (lines 626-635), same pattern but only a Delete item in the dropdown (no Edit for free feats).

**Imports to add:** `MoreVertical` from lucide-react, `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`.

### Button order in FeatListItem

The `actions` slot renders *before* the Info button in `FeatListItem.tsx` (line 82-85), so the final order will be: **⋮ menu → Info** button. This means Info stays as the rightmost, most accessible button — which matches the user's preference.

### Files to edit

| File | Change |
|------|--------|
| `src/components/CharacterFeatPicker.tsx` | Replace inline Edit/Delete with DropdownMenu (⋮) for both level feats and free feats |

