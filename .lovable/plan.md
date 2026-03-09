

## Make Wizard & Edit Character Fullscreen + Fix Description Placement

### Problem
1. The **CharacterCreationWizard** is rendered inside a small `DialogContent` (Dashboard) or a bordered `div` (PlayGame) — cramped and not fullscreen.
2. The **Edit Character dialog** uses `DialogContent` with `max-h-[85vh] sm:max-w-lg` — also not fullscreen.
3. The character **one-liner description** in `CharacterListItem` is placed inside `CardDescription` right after the title row, but it's competing with action buttons and gets truncated/illegible.

### Plan

**1. `src/pages/Dashboard.tsx`** — Make wizard and edit dialogs fullscreen:
- Replace the Create Character `DialogContent` class with a fullscreen style: `fixed inset-0 max-w-none w-full h-full rounded-none p-0` and wrap content in a scrollable container with header bar (title + close button).
- Same treatment for the Edit Character dialog — fullscreen with scroll and header bar.

**2. `src/pages/PlayGame.tsx`** — Make wizard and edit dialogs fullscreen:
- The wizard is currently inlined in a `<div className="border...">` inside the character overlay. Instead, when `creatingChar` is true, render a separate fullscreen overlay (same pattern as the character list overlay) dedicated to the wizard.
- The Edit Character `Dialog` gets the same fullscreen `DialogContent` treatment as Dashboard.

**3. `src/components/CharacterListItem.tsx`** — Move description below the header:
- Move `CardDescription` (the one-liner) out of the `CardHeader` title row and into its own line below the avatar+name+actions row, so it has full width and is readable. Place it as a `<p>` below the title div, before `CardContent` (feats list).

### Files to edit
- `src/pages/Dashboard.tsx`
- `src/pages/PlayGame.tsx`
- `src/components/CharacterListItem.tsx`

