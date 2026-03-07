

## Show Subfeats When Collapsed & Use Standard FeatListItem

### Problem
Subfeats are currently only visible inside `expandedContent`, meaning they disappear when the parent feat is collapsed. They also use custom inline markup instead of the standard `FeatListItem` component.

### Changes

#### 1. `FeatListItem.tsx` — Add `collapsedContent` slot

Add a new optional `collapsedContent` prop that renders below the collapsed description. This will hold subfeat items that are always visible regardless of expand state.

```typescript
interface FeatListItemProps {
  // ...existing
  collapsedContent?: ReactNode; // Always visible below the header
}
```

Render `collapsedContent` outside the `expanded` conditional, after the description line.

#### 2. `CharacterFeatPicker.tsx` — Refactor `renderSubfeats`

Replace the current custom subfeat rendering with nested `FeatListItem` components:

- **Fixed subfeats**: Render as a non-expandable `FeatListItem` with an "(auto)" badge, no actions.
- **List/Type subfeats with a picked value**: Render as a `FeatListItem` for the picked subfeat feat, with a `Pencil` icon action that opens the picker/select. Collapsible like any other feat.
- **Unpicked subfeats**: Show a small "+ Choose subfeat" button.

Move subfeat rendering from `expandedContent` to the new `collapsedContent` prop so subfeats are always visible. Keep the feat's own description/content in `expandedContent`.

The subfeat items will be indented with `ml-4` and use `compact` mode. Each picked subfeat renders as:
```
↳ [FeatListItem for subfeat] [✏️ edit icon]
```

For **list** subfeats, clicking the edit icon opens the existing `Select` dropdown inline. For **type** subfeats, clicking edit opens the picker dialog.

Track expanded state for subfeats with a separate `expandedSubfeatKey` state (e.g. `"cfId-slot"`).

### Files Changed

1. **`src/components/FeatListItem.tsx`** — Add `collapsedContent` prop
2. **`src/components/CharacterFeatPicker.tsx`** — Refactor `renderSubfeats` to use `FeatListItem`, pass as `collapsedContent`, use edit icons

