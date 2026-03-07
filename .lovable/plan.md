

## Plan: MediaWiki Section Parser + GM Navigation + Rename to "Prima RPG Helper"

### 1. Database Migration
```sql
ALTER TABLE public.games ADD COLUMN current_section text DEFAULT NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
```

Also fix the signup bug:
```sql
CREATE OR REPLACE FUNCTION public.assign_owner_if_first()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;
```

### 2. Create `src/lib/parseWikitext.ts`
Parser that converts raw MediaWiki wikitext into a tree of `WikiSection` objects:
- Detect headings via `/^(={2,6})\s*(.+?)\s*\1$/`
- Build nested tree by heading level
- Convert inline markup: `'''bold'''`, `''italic''`, `* list`, `[[links]]`, `----`
- Each section gets: `id` (slug), `title`, `level`, `content` (HTML), `children[]`

### 3. Create `src/components/WikiSectionTree.tsx`
Recursive collapsible component:
- Radix `Collapsible` per section with chevron toggle
- Title styled by heading level (size decreases with depth)
- **Play button** (triangle icon) on each section header -- calls `onActivateSection(sectionId)`
- **Active section highlight**: `bg-black/10 border-l-4 border-black` (black, not orange)
- Children indented and rendered recursively
- Body content rendered as `dangerouslySetInnerHTML`

### 4. Update `src/pages/HostGame.tsx`
- Import parser + `WikiSectionTree`
- Parse `scenarioContent` into section tree
- Read `game.current_section` for active state
- Play button click: `supabase.from("games").update({ current_section: sectionId }).eq("id", game.id)`
- Replace raw text display with collapsible section tree

### 5. Update `src/pages/PlayGame.tsx`
- Parse scenario content with same parser
- Read `game.current_section` from realtime-updated game data
- Show only the active section's content prominently, with a "waiting for GM" state when no section is active

### 6. Rename to "Prima RPG Helper"
Replace all occurrences of "Prima Danse Macabre" / "Prima Danse Macabre RPG Helper" / "PrimaDanse" across:

| File | Changes |
|---|---|
| `index.html` | title, og:title, description, apple-mobile-web-app-title, twitter |
| `vite.config.ts` | PWA manifest name → "Prima RPG Helper", short_name → "PrimaRPG" |
| `src/pages/Home.tsx` | Header, hero, footer text |
| `src/pages/Dashboard.tsx` | Header title |
| `src/pages/Auth.tsx` | Login heading |
| `src/pages/Install.tsx` | Install page heading and back button text |

### Files summary
| File | Action |
|---|---|
| Database migration | Add `current_section` + fix trigger |
| `src/lib/parseWikitext.ts` | Create |
| `src/components/WikiSectionTree.tsx` | Create |
| `src/pages/HostGame.tsx` | Modify |
| `src/pages/PlayGame.tsx` | Modify |
| `index.html` | Rename |
| `vite.config.ts` | Rename |
| `src/pages/Home.tsx` | Rename |
| `src/pages/Dashboard.tsx` | Rename |
| `src/pages/Auth.tsx` | Rename |
| `src/pages/Install.tsx` | Rename |

