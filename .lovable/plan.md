

## Make the Dice Bounce Around During Animation

### Change: `src/components/DiceRoller.tsx`

Replace the `dice-tumble` keyframe animation with one that moves the die around the screen while rotating — bouncing to different positions before settling in the center.

Update the CSS keyframes at the bottom of the file:

```css
@keyframes dice-tumble {
  0%   { transform: translate(-150px, -200px) rotate(0deg) scale(0.3); opacity: 0; }
  10%  { opacity: 1; }
  20%  { transform: translate(120px, 150px) rotate(360deg) scale(1.1); }
  35%  { transform: translate(-100px, 80px) rotate(720deg) scale(0.9); }
  50%  { transform: translate(80px, -120px) rotate(1080deg) scale(1.05); }
  65%  { transform: translate(-60px, 60px) rotate(1300deg) scale(0.95); }
  80%  { transform: translate(30px, -30px) rotate(1400deg) scale(1.02); }
  100% { transform: translate(0, 0) rotate(1440deg) scale(1); opacity: 1; }
}
```

This makes the die hop across the screen in a zigzag pattern while spinning, then settle into the center for the result reveal. Single file change only.

