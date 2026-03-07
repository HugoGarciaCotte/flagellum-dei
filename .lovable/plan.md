

## Standardize Feat Display Components

### Current State

Feat items are rendered with duplicated markup in 3 places:
1. **Picker dialog** (CharacterFeatPicker lines 838-884) — expandable feat with "Pick this feat" button
2. **Assigned level feats** (lines 629-704) — feat with note, edit/delete, subfeats
3. **Assigned free feats** (lines 720-784) — nearly identical to level feats

All three share the same core: title + category badges + description + expandable FeatDetailsDisplay. But actions differ.

ManageFeats (admin) has its own distinct rendering with status icons, raw content preview, regeneration — this stays separate per the request.

### Plan

#### 1. Create `FeatListItem` component

A single standardized feat item used everywhere except admin.

```typescript
interface FeatListItemProps {
  feat: { title: string; categories: string[]; description: string | null; content: string | null };
  expanded: boolean;
  onToggleExpand: () => void;
  note?: string | null;
  actions?: React.ReactNode;        // right-side action buttons
  expandedContent?: React.ReactNode; // extra content below when expanded (subfeats, pick button)
  compact?: boolean;                 // smaller padding for assigned feats
}
```

Renders:
- Clickable header: title + chevron + category badges
- Optional note display
- Actions slot (edit/delete buttons, or nothing)
- Collapsed: 1-line description
- Expanded: full description + FeatDetailsDisplay + expandedContent slot

**New file: `src/components/FeatListItem.tsx`**

#### 2. Update `CharacterFeatPicker.tsx`

Replace the 3 duplicated feat renderings with `<FeatListItem>`:

- **Picker dialog items**: `<FeatListItem>` with `expandedContent` containing the "Pick this feat" button and validation spinner
- **Level feats**: `<FeatListItem>` with `actions` for edit/delete/note buttons and `expandedContent` for subfeats
- **Free feats**: Same as level feats but with GM-only delete

The filtering logic, mutations, subfeat rendering, and picker dialog structure all stay in `CharacterFeatPicker` — only the repeated item markup gets replaced.

#### 3. Files changed

- **New**: `src/components/FeatListItem.tsx`
- **Modified**: `src/components/CharacterFeatPicker.tsx` — replace 3 inline feat renderings with `<FeatListItem>`

No changes to `ManageFeats.tsx` (admin stays different as requested).

