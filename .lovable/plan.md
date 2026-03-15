

## Increase base font size

The app uses Crimson Text (serif) which renders visually smaller than typical sans-serif fonts at the same pixel size. A global bump will improve readability without needing to touch individual components.

### Change

**`src/index.css`** — add `font-size: 18px` to the `body` rule (inside the existing `@layer base` block). This scales all `rem`-based sizing across the app, affecting body text, inputs, buttons, etc., while headings (Cinzel) also benefit proportionally.

```css
body {
  @apply bg-background text-foreground;
  font-family: 'Crimson Text', serif;
  font-size: 18px;
  /* ... existing safe-area padding */
}
```

One line addition, one file.

