

## Plan: MediaWiki Section Parser + GM Section Navigation

### Overview
Implement the full MediaWiki parsing, collapsible section tree with play buttons for the GM, and player view that shows only the active section. The GM's current section is highlighted with a distinct dark background.

### 1. Database Migration
Add `current_section` column and enable realtime:
```sql
ALTER TABLE public.games ADD COLUMN current_section text DEFAULT NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
```

### 2. Create `src/lib/parseWikitext.ts`
Parser converts MediaWiki wikitext into a nested tree:
- Detect headings via `/^(={2,6})\s*(.+?)\s*\1$/`
- Build nested `WikiSection[]` tree by heading level
- Convert inline markup: `'''bold'''` → `<strong>`, `''italic''` → `<em>`, `* items` → `<ul><li>`, `----` → `<hr>`, `[[links]]` → text
- Interface: `{ id: string; title: string; level: number; content: string; children: WikiSection[] }`

### 3. Create `src/components/WikiSectionTree.tsx`
Recursive collapsible tree component:
- Each section header row: collapse chevron + title (sized by level) + **Play button** (▶ icon)
- **Active section**: `bg-black/15 border-l-4 border-black` with smooth transition
- Play button calls `onActivateSection(sectionId)` prop
- Children rendered recursively with indentation
- Body content via `dangerouslySetInnerHTML`

### 4. Update `src/pages/HostGame.tsx`
- Import parser + `WikiSectionTree`
- Parse `scenarioContent` into section tree
- Track active section from `game.current_section`
- Play button handler: `supabase.from("games").update({ current_section: sectionId }).eq("id", game.id)`
- Add realtime subscription for game updates (to reflect current_section changes)
- Replace raw text card with the collapsible section tree

### 5. Update `src/pages/PlayGame.tsx`
- Import parser, find active section by `game.current_section`
- When no section active: show "Waiting for the Game Master..." message
- When section active: display that section's title and HTML content prominently
- Realtime subscription already exists for game updates

### Files
| File | Action |
|---|---|
| Database migration | Add `current_section` column + realtime |
| `src/lib/parseWikitext.ts` | Create |
| `src/components/WikiSectionTree.tsx` | Create |
| `src/pages/HostGame.tsx` | Modify |
| `src/pages/PlayGame.tsx` | Modify |

