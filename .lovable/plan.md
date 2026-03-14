

## Plan: Convert background inserter into a generic "Insert Tag" dropdown

### Concept

Replace the current dedicated background image toolbar with a **dropdown button** that can insert different types of wikitext metadata tags (`<!--@ key: value @-->`). The background image insertion (with its 3 modes: link, upload, AI) becomes one option in this dropdown. This makes it extensible for future tag types like music, effects, etc.

### UI Design

```text
[ + Insert Tag ▾ ]
  ├─ 🖼 Background Image  → opens current 3-mode panel (link/upload/AI)
  ├─ 🎵 Music             → (future, placeholder for now)
  └─ ... extensible
```

Use a `Popover` or `DropdownMenu` triggered by a single "Insert Tag" button. When "Background Image" is selected, the existing 3-mode toolbar (link/upload/AI) appears inside the popover or inline below. Other items can be added later.

### Changes

#### 1. `ScenarioEditorPanel.tsx`

- Replace the always-visible background toolbar block (lines 398-538) with:
  - A `DropdownMenu` button labeled "Insert Tag" with a `Plus` icon
  - Menu items: "Background Image" (and a disabled "Music" placeholder)
  - Selecting "Background Image" sets `insertMode: "background" | null` state
  - When `insertMode === "background"`, render the existing 3-mode panel (link/upload/AI) inline below the button — same UI, just toggled by dropdown selection
  - A small "✕" close button to collapse the panel
- New state: `insertMode: "background" | null` (will grow to `"music" | ...` later)

#### 2. `src/i18n/en.ts`

- `"adminScenarios.insertTag"`: "Insert Tag"
- `"adminScenarios.insertTagBg"`: "Background Image"
- `"adminScenarios.insertTagMusic"`: "Music (coming soon)"

### Files changed
- **Edit**: `src/components/ScenarioEditorPanel.tsx` — wrap background toolbar in dropdown
- **Edit**: `src/i18n/en.ts` — 3 new keys

