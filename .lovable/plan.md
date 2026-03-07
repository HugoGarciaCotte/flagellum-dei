

## Expandable Feat Descriptions in Picker

### Change

In the fullscreen feat picker dialog, each feat item currently shows the description truncated to 1 line. Replace this with an expand/collapse pattern:

- Add `expandedFeatId` state (string | null)
- Clicking a feat's row toggles its expanded state (showing full description) instead of immediately selecting it
- Add a chevron icon that rotates when expanded
- Show a "Pick" button inside the expanded area to confirm selection
- The description goes from `line-clamp-1` to full display when expanded

### File: `src/components/CharacterFeatPicker.tsx`

- Add state: `const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null)`
- Reset it when dialog opens/closes
- Replace the feat `<button onClick={handleFeatSelect}>` with a container `<div>`:
  - Top row (clickable): title + badges + chevron icon → toggles `expandedFeatId`
  - When expanded: full description text + a "Pick this feat" `<Button>` that calls `handleFeatSelect`
- Import `ChevronDown` from lucide-react

