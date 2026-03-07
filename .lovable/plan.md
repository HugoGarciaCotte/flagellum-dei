

## Fix: Unreadable text on active section highlight

The active section in `WikiSectionTree.tsx` uses `bg-black` background but the title keeps `text-foreground` (dark) and content keeps `text-muted-foreground` (dark gray), making them unreadable.

### Changes in `src/components/WikiSectionTree.tsx`

1. **Title (line 60)**: Change from always `text-foreground` to conditionally use `text-white` when active
2. **Content (line 83)**: Add conditional `text-white/80` when active — requires passing `isActive` context or applying the class conditionally
3. **Chevron (line 56)**: Change `text-muted-foreground` to `text-white/70` when active
4. **Active background**: Consider switching from `bg-black` to `bg-primary text-primary-foreground` to match the app's gold/parchment theme — this would be more cohesive than stark black

### Recommended approach
Replace the black active style with the app's primary color scheme:
- `bg-black text-white border-l-4 border-black` → `bg-primary text-primary-foreground border-l-4 border-primary`
- Title: `text-foreground` → conditionally `text-primary-foreground` when active
- Content: `text-muted-foreground` → conditionally `text-primary-foreground/80` when active
- Chevron: conditionally `text-primary-foreground/70` when active

Single file change: `src/components/WikiSectionTree.tsx`

