

## Fix dice button z-index

Lower the dice button's z-index so it naturally sits behind the expanded ambiance panel.

### Change — `src/components/DiceRoller.tsx`

**Line 143**: Change `z-50` to `z-40` on the fixed container div. The ambiance panel uses `z-50`, so the dice button will render behind it when expanded.

One line change, no new props or state needed.

