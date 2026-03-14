

## Fix: Always Apply Meta Tags to Current Section

**Problem**: Meta tags after a heading go into `pendingMeta`, then get consumed by the *next* heading — shifting all backgrounds one section forward.

**Fix in `src/lib/parseWikitext.ts`**:

1. **Lines 195-202** — Change meta handling to apply directly to `currentTarget` when inside a section:
```typescript
if (hasMetaTags && isMetaOnlyLine(line)) {
  if (!seenHeading) {
    Object.assign(scenarioMeta, lineMeta);
  } else if (currentTarget) {
    Object.assign(currentTarget.metadata, lineMeta);
  }
  continue;
}
```

2. **Lines 223-231** — Remove `pendingMeta` from section creation since it's no longer used:
```typescript
const section: WikiSection = {
  id: slugify(title),
  title,
  level,
  content: "",
  metadata: {},
  children: [],
};
```
Remove the `pendingMeta = {};` line.

3. **Line 177** — Remove the `let pendingMeta` declaration entirely.

This eliminates `pendingMeta` completely. Meta tags are either scenario-level (before any heading) or belong to the current section.

