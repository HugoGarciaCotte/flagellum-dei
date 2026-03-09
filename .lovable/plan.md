

## Redesign PlayGame: Bottom Sheet Character + Right-Aligned Dice

Replace the current tab-based layout with a single Quest view, a floating dice button on the right, and a bottom sheet for the character that peeks from the bottom and can be expanded fullscreen.

### Current State
- PlayGame uses `<Tabs>` with "Quest" and "Character" tabs
- DiceRoller is a FAB at bottom-right with a full-screen overlay for rolls
- CharacterSheet is shown in its own tab

### New Layout

```text
┌──────────────────────────┐
│  PageHeader              │
├──────────────────────────┤
│                          │
│   Quest content          │
│   (section title or      │
│    waiting message)      │
│                    [🎲]  │  ← dice button, right edge, vertically centered-ish
│                          │
├──────────────────────────┤
│ ▬ Character Name    ✕    │  ← bottom peek bar (collapsed)
└──────────────────────────┘

 ── when expanded ──

┌──────────────────────────┐
│ ▬ Character Name    ✕    │  ← drag handle + close
├──────────────────────────┤
│  Full CharacterSheet     │
│  (scrollable)            │
│                          │
└──────────────────────────┘
```

### Changes

#### 1. `src/pages/PlayGame.tsx` — Major restructure

- **Remove `<Tabs>`** entirely. The Quest view is always visible.
- **Add state**: `sheetExpanded: boolean` (default `false`).
- **Move DiceRoller** out of the quest section — it already renders as a fixed FAB, just keep it at top level. The button text can be shortened to just the icon since space is tight.
- **Add bottom character peek bar**: A fixed-bottom element showing the character name + a small drag-handle icon. Clicking it sets `sheetExpanded = true`.
- **Add fullscreen character sheet overlay**: When `sheetExpanded` is true, render a full-screen (or near-full, leaving room for the peek bar header) panel sliding up from the bottom. Contains `<CharacterSheet>` + character selection list. Has an X button to collapse back.
- **If no character selected**: The peek bar shows "Select a character" and tapping it opens the sheet with just the character list.
- Keep the character selection list (with "New Character" button) inside the expanded sheet, below the CharacterSheet.

#### 2. `src/components/DiceRoller.tsx` — Minor tweak

- Change the FAB from `bottom-6 right-6` to `bottom-20 right-6` so it sits above the character peek bar.
- Optionally make the button smaller/icon-only to save space: remove the "Click to roll a die" text, just show the dice icon in a round button.

### No backend or database changes needed.

