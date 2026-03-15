

## Move dice button to the right, above the ambiance pill

Currently: DiceRoller is `position="left"` and GameTimer is `position="right"`.  
Change: Both on the right — dice above ambiance.

### Changes

**`src/pages/HostGame.tsx`** line 176: Change `position="left"` to `position="right"`.

**`src/components/DiceRoller.tsx`**: Change `bottom-20` to `bottom-28` (or similar) so the dice button sits above the ambiance pill instead of overlapping it.

Two lines, two files.

