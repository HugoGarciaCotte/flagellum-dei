

## Plan: MediaWiki Section Parser + GM Section Navigation

### Overview
Parse MediaWiki wikitext into a hierarchical, collapsible section tree. The GM can "play" any section, highlighting it and broadcasting the current section to players via realtime.

### 1. Database Migration
Add a `current_section` column to the `games` table to track which section the GM is currently presenting:

```sql
ALTER TABLE public.games ADD COLUMN current_section text DEFAULT NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
```

### 2. New Utility: `src/lib/parseWikitext.ts`
A pure function that parses MediaWiki wikitext into a tree structure:

- **Input**: raw wikitext string
- **Output**: array of `WikiSection` objects:
  ```typescript
  interface WikiSection {
    id: string;        // slugified heading
    title: string;     // heading text
    level: number;     // 2-6 (== to ======)
    content: string;   // body text (basic markup converted: bold, italic, lists, links)
    children: WikiSection[];
  }
  ```
- **Parsing logic**:
  - Split content by lines, detect headings via regex: `/^(={2,6})\s*(.+?)\s*\1$/`
  - Build nested tree based on heading level (level 2 is top, level 3 nests inside level 2, etc.)
  - Content between headings becomes that section's body
  - Basic inline markup conversion: `'''bold'''` → `<strong>`, `''italic''` → `<em>`, `* list items` → `<ul><li>`, `[[links]]` → plain text, `----` → `<hr>`

### 3. New Component: `src/components/WikiSectionTree.tsx`
A recursive collapsible section renderer for the GM view:

- Uses Radix `Collapsible` for each section
- Each section header row contains:
  - Collapse/expand chevron
  - Section title (styled by heading level)
  - **Play button** (▶) — calls `onActivateSection(sectionId)` to set the current section
- **Active section** gets a distinct highlight (e.g., `bg-primary/15 border-l-4 border-primary`)
- Children sections render recursively, indented
- Section body content rendered as HTML (from the parser)

### 4. Update `src/pages/HostGame.tsx`
- Import the parser and `WikiSectionTree`
- Parse `scenarioContent` into sections
- Track `currentSection` from `game.current_section`
- On play button click: `supabase.from("games").update({ current_section: sectionId }).eq("id", game.id)`
- Replace the raw `<pre>` content display with the collapsible section tree

### 5. Update `src/pages/PlayGame.tsx`
- Parse the scenario content using the same parser
- Read `game.current_section` (already updated via realtime subscription)
- Display only the active section's content prominently, or highlight it within the full content
- The realtime subscription already exists — it will pick up `current_section` changes automatically

### Files to create/modify
| File | Action |
|---|---|
| `src/lib/parseWikitext.ts` | Create — parser utility |
| `src/components/WikiSectionTree.tsx` | Create — GM collapsible tree |
| `src/pages/HostGame.tsx` | Modify — use parser + tree + update current_section |
| `src/pages/PlayGame.tsx` | Modify — show active section from game state |
| Database migration | Add `current_section` column to `games` |

