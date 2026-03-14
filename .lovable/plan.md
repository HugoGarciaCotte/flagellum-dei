

## Section Break Marker — Corrected Semantics

The `=` count maps to heading levels: `=Title=` is level 1, `==Title==` is level 2, etc. So a bare closing marker follows the same convention:
- `==` → closes level 1 (same as `=X=`)
- `====` → closes level 2 (same as `==X==`)
- `======` → closes level 3

Formula: **closing level = number of `=` signs / 2**

### Changes

**`src/lib/parseWikitext.ts`**
- Add regex before the heading check: `/^(={2,6})\s*\1$/` won't work since headings use that. Instead detect `/^={2,6}$/ ` — a line that is *only* even-count equals signs with no title text.
- Actually the existing `HEADING_RE` (`/^(={1,6})\s*(.+?)\s*\1$/`) requires `.+?` (at least one char of title), so bare `====` won't match it — good, no conflict.
- New check: `const closeMatch = line.match(/^(={2,6})$/)`
  - If matched: `flushBody()`, compute `closeLevel = closeMatch[1].length / 2`
  - Pop the stack while `stack.length > 0 && stack[stack.length-1].level >= closeLevel`
  - Set `currentTarget` to top of stack (or null)
  - `continue`

**`src/components/ScenarioEditorPanel.tsx`** — Add a "Section Break" insert option (insert `====` at cursor). Low priority, can skip.

