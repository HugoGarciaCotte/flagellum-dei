

## Bug: Content After Section Break `====` Is Lost

**Root cause**: In `parseWikitext`, when `====` closes a section and pops the stack to empty, `currentTarget` becomes `null`. Any subsequent content lines accumulate in `currentBodyLines`, but `flushBody()` only saves content when `currentTarget !== null`. So all content after a root-level `====` is silently discarded.

### Fix

**File: `src/lib/parseWikitext.ts`** (lines 204-213)

After the section break pops the stack, if the stack is empty, keep `currentTarget` pointing to the last section that was popped rather than setting it to `null`. This way, content after `====` appends to the section that was just closed — which is the correct behavior since the content logically belongs to that section's trailing body.

Change the close-match block so that before popping, we save a reference to the section being closed. If after popping the stack is empty, use that saved reference as `currentTarget`.

```typescript
const closeMatch = line.match(/^(={2,6})$/);
if (closeMatch) {
  flushBody();
  const closeLevel = closeMatch[1].length / 2;
  let lastPopped: WikiSection | null = null;
  while (stack.length > 0 && stack[stack.length - 1].level >= closeLevel) {
    lastPopped = stack.pop()!.section;
  }
  currentTarget = stack.length > 0 ? stack[stack.length - 1].section : lastPopped;
  continue;
}
```

This ensures content after `====` is never silently lost — it becomes trailing content of the closed section.

