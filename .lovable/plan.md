

## Reduce gap between dice button and ambiance pill

The dice button is positioned at `bottom-28` (112px from bottom) while the ambiance pill sits at `bottom-6` (24px). That's an ~88px gap — way too much.

### Change — `src/components/DiceRoller.tsx`

**Line 170**: Change `bottom-28` to `bottom-[4.5rem]` — places the dice button snugly above the ambiance pill with just a small natural gap.

