

## Add One-Liner Description to FeatListItem

### Problem
The `description` field (one-liner) is already passed to `FeatListItem` via `feat.description` but is never shown in the collapsed state. Users can't see what a feat does at a glance.

### Change: `src/components/FeatListItem.tsx`

Add a line below the title/badges row (after line 83) to display `feat.description` when available:

```tsx
{feat.description && (
  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{feat.description}</p>
)}
```

This goes inside the `<div className="w-full text-left ...">` block, right after the closing `</div>` of the flex row containing the title and badges (line 83), so it appears as a subtitle below the feat name.

### Single file change
- `src/components/FeatListItem.tsx`

