

## Standardize Character Sheet into a Single Reusable Component

### Current State — 4 Duplicate Character Edit UIs

| Location | Context | What it shows |
|---|---|---|
| **Dashboard.tsx** (Dialog) | Player edits own character | Name + Desc inputs, CharacterFeatPicker (player mode) |
| **PlayGame.tsx** (Sheet) | Player views character in-game | Name/desc display (read-only), CharacterFeatPicker with scenarioLevel |
| **GMPlayerList.tsx** (Dialog) | GM edits player's character from Dashboard | Name + Desc inputs, CharacterFeatPicker (gm mode) |
| **PlayerListSheet.tsx** (Sheet) | GM edits player's character in-game | Name + Desc inputs, CharacterFeatPicker (gm mode) |

All four duplicate the same pattern: character name/description fields + `CharacterFeatPicker`. Changes to one don't propagate to the others.

### Plan: Extract a `CharacterSheet` Component

Create **`src/components/CharacterSheet.tsx`** — a single component that handles everything:

```typescript
interface CharacterSheetProps {
  characterId: string;
  mode: "player" | "gm";
  scenarioLevel?: number;
  onDone?: () => void;       // callback to close parent dialog/sheet
}
```

**Behavior based on `mode`:**
- **Both modes**: Show character name + description (editable), CharacterFeatPicker, Done button
- **`gm` mode only**: Free feats section always visible (even when empty), access to all feats including hidden ones in the picker
- **`player` mode**: Standard feat filtering

**Internal logic:**
- Fetches character data by `characterId`
- Handles name/description editing + save mutation internally
- Renders `CharacterFeatPicker` with the correct `mode` and `scenarioLevel`

### Changes per file

1. **New file: `src/components/CharacterSheet.tsx`**
   - Self-contained component with name/desc editing + CharacterFeatPicker
   - Accepts `mode`, `scenarioLevel`, `onDone` props

2. **`src/pages/Dashboard.tsx`**
   - Replace the inline name/desc/feats form in the character dialog with `<CharacterSheet characterId={activeCharId} mode="player" onDone={closeDialog} />`
   - Keep the "New Character" creation form (name + desc + create button) separate — once created, switch to `CharacterSheet`

3. **`src/pages/PlayGame.tsx`**
   - Replace the inline character card + CharacterFeatPicker in the Sheet with `<CharacterSheet characterId={selectedCharacter.id} mode="player" scenarioLevel={...} />`

4. **`src/components/GMPlayerList.tsx`**
   - Replace the edit dialog contents with `<CharacterSheet characterId={editPlayer.character_id} mode="gm" onDone={() => setEditPlayer(null)} />`

5. **`src/components/PlayerListSheet.tsx`**
   - Replace the inline edit form with `<CharacterSheet characterId={char.id} mode="gm" />`

### Result
One component, one behavior. Modify the character sheet once, it updates everywhere. GM-specific features (free feats always visible, all feats accessible) are controlled by the `mode` prop passed to both `CharacterSheet` and `CharacterFeatPicker`.

