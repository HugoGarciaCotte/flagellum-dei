## Diagnosis

The dialog header in `src/components/CharacterDetailsDialog.tsx` is rendering correctly — items are vertically centered in a short `py-3` bar. The perception of "poor centering" comes from the bar being visually indistinguishable from the dialog body:

- Bar background: `bg-card/80` over page `bg-background` (`#0B0B0B`). `--card` in your theme is nearly identical to background → no surface contrast.
- Bar separator: `border-b border-border/50` → 1px line at 50% opacity → invisible against dark.
- Net effect: icons appear to float alone at the top of a huge dark area, which reads as "wrongly centered" even though the bar itself is fine.

## Fix

Make the bar a visible surface so its actual extent is obvious. Edit only line 70 of `src/components/CharacterDetailsDialog.tsx`:

```tsx
<div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0 safe-top gap-2">
```

Changes:
- `bg-card/80 backdrop-blur` → `bg-card` (full opacity, real surface)
- `border-border/50` → `border-border` (full-strength divider)

That's it — no layout change, no centering change, no other files touched. Items will visibly sit inside a contained bar.

## Not in scope

- The published-site trash icon rendering as `01F5D1` is from an older deploy. A republish will pick up current code. No code change needed.
- `.safe-top` notch behavior is correct on desktop; iOS-PWA notch defensiveness can be a separate follow-up if needed.
