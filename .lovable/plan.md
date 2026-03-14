

## Fix: Content Overwritten on Section Resume After Break

**Root cause**: `flushBody()` uses assignment (`=`) instead of append (`+=`). When `====` closes Section 2 and returns to Section 1, the subsequent "EFG" content **overwrites** Section 1's original "ABC" content.

Trace:
1. `=Section 1=` → currentTarget = Section 1
2. `ABC` → buffered
3. `==Section 2==` → flush "ABC" to Section 1 via `content = ...` ✓
4. `CDE` → buffered  
5. `====` → flush "CDE" to Section 2, pop stack, currentTarget = Section 1
6. `EFG` → buffered
7. End → flush "EFG" to Section 1 via `content = ...` ← **overwrites ABC**

### Fix

**`src/lib/parseWikitext.ts`** — `flushBody` function (line ~183):

Change content assignment from `=` to `+=` so resumed sections append rather than overwrite:

```typescript
function flushBody() {
  if (currentTarget && currentBodyLines.length > 0) {
    currentTarget.content += convertBodyToHtml(currentBodyLines);
  }
  currentBodyLines = [];
}
```

Single-line change. No other files affected.

