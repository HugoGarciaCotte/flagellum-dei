

## Reorganize Dashboard: Player-First Layout

The dashboard currently leads with "Join a Game" as a small button and then lists all scenarios with "Host Game" prominently. Since most users are players, the layout should be reorganized.

### New Layout for `src/pages/Dashboard.tsx`

**Section 1 — Join a Game (prominent, top of page)**
- Inline join code input + button directly on the page (no dialog needed) — large, centered, immediately visible

**Section 2 — My Characters**
- Query `characters` table filtered by `user_id`
- Display character cards with name and description
- "Create Character" button opens a Dialog with name + description fields, inserts into `characters` table
- Each card has Edit/Delete actions

**Section 3 — Host a Game (smaller, bottom)**
- Small `outline` or `ghost` button labeled "Host a Game"
- Clicking it expands/reveals the scenario list (use Collapsible or a state toggle)
- Scenario cards with "Host Game" button remain as-is but in a collapsible section

### Data flow
- Characters query: `supabase.from("characters").select("*").eq("user_id", user.id)`
- Create character mutation: insert into `characters` with `user_id` and `name`
- Active games section stays as-is (shown when games exist)

### Single file change
`src/pages/Dashboard.tsx` — restructure the layout, add characters query/CRUD, move scenarios into a collapsible "Host a Game" section.

