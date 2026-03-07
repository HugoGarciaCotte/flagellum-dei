

## Simplified D6 Dice Roller with Animation and Sound

### Changes to `src/components/DiceRoller.tsx` — Full rewrite

**Behavior:**
- FAB button with dice icon + "Click to roll a die" tooltip/label
- Single click rolls a d6 (no popover, no dice selection)
- On click: play a dice rolling sound, show a full-screen overlay with a 3D CSS animated die that tumbles/bounces, then lands on the result number
- After ~1.5s animation, the die settles showing the result face, then fades out after a moment

**Implementation:**
- Remove the Popover and DICE array — replace with a single button click handler
- **Sound**: Use `new Audio()` with a free dice roll sound (base64-encoded short clip or a public domain URL). Play on click.
- **Animation**: Render a fixed overlay (`fixed inset-0 z-50`) with a die face element that:
  - Uses CSS keyframes for a tumbling rotation effect (3D `rotateX`/`rotateY` transforms over ~1.2s)
  - Rapidly cycles through numbers 1-6 during the roll
  - Settles on the final result with a scale-in effect
  - Auto-dismisses after ~2.5s total
- **Die face**: A rounded square with dot pattern (classic die face) or large number display, styled with shadows
- The button itself shows "🎲 Roll" text alongside the icon

**Animation keyframes** (added via inline style or tailwind config):
```
@keyframes dice-tumble {
  0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
  20% { transform: rotate(720deg) scale(1.2); opacity: 1; }
  40% { transform: rotate(1080deg) scale(0.9); }
  60% { transform: rotate(1440deg) scale(1.1); }
  80% { transform: rotate(1620deg) scale(1); }
  100% { transform: rotate(1800deg) scale(1); opacity: 1; }
}
```

**Sound**: Generate a short base64-encoded dice roll sound using Web Audio API (synthesized click/rattle) to avoid external dependencies.

### Single file change
- `src/components/DiceRoller.tsx`

