

## Auto-select first character when none is selected

### Problem
When a player joins a game and already has characters but hasn't selected one, no character is auto-selected. Also confirmed: the wizard `onCreated` already calls `selectCharacter(id)`, so new character creation is handled.

### Change

**`src/pages/PlayGame.tsx`** — Add a `useEffect` after the `myPlayer` and `sortedCharacters` definitions (~line 53):

```tsx
useEffect(() => {
  if (myPlayer && !myPlayer.character_id && sortedCharacters.length > 0) {
    selectCharacter(sortedCharacters[0].id);
  }
}, [myPlayer, sortedCharacters]);
```

This auto-selects the most recent character when the player has characters but none is currently selected (e.g. first time joining, or after a character was unlinked).

One file changed, no new translation keys needed.

