

## Fullscreen Tabs for Game View vs Character Sheet

### Problem
Currently the character sheet is buried in a side Sheet drawer. Players need easy, first-class access to view/edit their character and feats while in a game.

### Approach
Replace the Sheet-based character UI with two fullscreen tabs at the top of PlayGame: **Quest** (the game view) and **Character** (the full character sheet). Use the existing `Tabs` component.

### Changes to `src/pages/PlayGame.tsx`

1. **Remove** the `Sheet`/`SheetTrigger`/`SheetContent` imports and the character Sheet from `rightActions`.
2. **Add** a `activeTab` state: `"quest" | "character"`.
3. **Wrap** the main content area in `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`:
   - Place `TabsList` in the header area (below `PageHeader`, or as a sticky bar). Two triggers: "Quest" (with Scroll icon) and character name (with User icon).
   - `TabsContent value="quest"`: The existing game main content (section title / waiting message) + DiceRoller.
   - `TabsContent value="character"`: A scrollable full-page area containing:
     - The `CharacterSheet` component for the selected character (with feat picker, full details).
     - Below it, a character switcher section (list of characters + create new), same as the current Sheet content but laid out full-width.
4. **Keep** the `PageHeader` with back button, scenario title, and offline badge. Remove the character button from `rightActions` since tabs handle it now.

### Layout
```text
┌─────────────────────────────────┐
│ ← Scenario Title        [Offline]│
├─────────────────────────────────┤
│  [ Quest ]  [ Character Name ]  │  ← TabsList, sticky
├─────────────────────────────────┤
│                                 │
│   (Quest tab or Character tab)  │
│                                 │
└─────────────────────────────────┘
```

### Files Changed
1. **`src/pages/PlayGame.tsx`** — Replace Sheet with fullscreen Tabs layout

