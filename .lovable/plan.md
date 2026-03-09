

## Replace Chevron with Two Action Buttons on Collapsed Feats

### Problem
In the picker list, collapsed feats show a confusing chevron arrow. The user wants two clear actions visible upfront: one to select the feat immediately, and one to see its details.

### Changes

#### `src/components/FeatListItem.tsx`
- Remove the `ChevronDown` icon entirely
- Remove `cursor-pointer` and `onClick={onToggleExpand}` from the outer div (clicking the card no longer toggles)
- Add a new optional prop `onQuickAction?: () => void` and `quickActionLabel?: string` for the "Take" button
- When `onQuickAction` is provided (picker context), render two small buttons after the title/badges: **"Take"** (primary, calls `onQuickAction`) and **"Details"** (outline, calls `onToggleExpand`)
- When `onQuickAction` is NOT provided (assigned feats context), keep the card clickable to expand (restore `onClick={onToggleExpand}` and `cursor-pointer`) — assigned feats don't need the two-button pattern

#### `src/components/CharacterFeatPicker.tsx` (picker view, ~line 785-799)
- Pass `onQuickAction={() => handleFeatSelect(feat.id)}` and `quickActionLabel="Take"` to `FeatListItem`
- Remove the `expandedContent` "Pick this feat" button since "Take" is now always visible
- Keep `expandedContent` empty or remove it — the details view just shows content

### UI Result (collapsed feat in picker)
```
[ Feat Title    [Combat] [General]     [Take] [Details] ]
```
Clicking "Take" picks the feat. Clicking "Details" expands to show full content. No chevron anywhere.

