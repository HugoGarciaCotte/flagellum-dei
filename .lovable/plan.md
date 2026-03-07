

## Secure Player View + Character Selection + Dice Roller

### Problem
Players currently see the full scenario text content, which should be GM-only. Players should only see the section title and any images. They also need character management and dice rolling.

### Changes

#### 1. Database: Allow players to update their character selection
- Add RLS policy on `game_players` for UPDATE so players can set their `character_id`
```sql
CREATE POLICY "Players can update own game_player" ON public.game_players
FOR UPDATE TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### 2. `src/pages/PlayGame.tsx` — Complete rewrite
- **Remove scenario content fetch**: Query `games` table but do NOT select `scenarios.content`. Only select `scenarios.title`.
- **Main view**: When GM activates a section, show only the section **title** and any **images** extracted from it (using `extractImageUrls` on the section content fetched server-side — but actually, we should not send content at all). Instead, we store/send only the section title via `current_section` (which is already just the slug ID). Display: section title only, no body text.
- **Character tab**: Add a bottom sheet or tab overlay where the player can:
  - See their currently selected character
  - Pick from their existing characters list
  - Create a new character inline
  - Updates `game_players.character_id` when selecting
- **Waiting state**: When no section is active, show scenario title + "Waiting for the Game Master..."

#### 3. `src/components/DiceRoller.tsx` — New component
- Floating action button (bottom-right) with a dice icon
- Click opens a popover/dialog with dice options (d4, d6, d8, d10, d12, d20, d100)
- Shows the roll result with animation
- Used on both PlayGame and HostGame pages

#### 4. `src/pages/HostGame.tsx` — Add dice roller
- Import and render `DiceRoller` component

### Technical Details

**Security fix in PlayGame query:**
```typescript
// BEFORE (leaks content):
.select("*, scenarios(title, content)")

// AFTER (safe):
.select("*, scenarios(title)")
```

**Character selection flow:**
- Fetch player's `game_players` row to get current `character_id`
- Fetch user's characters from `characters` table
- On select: `supabase.from("game_players").update({ character_id }).eq("game_id", gameId).eq("user_id", user.id)`

**DiceRoller component:**
- FAB with `Dices` lucide icon, fixed bottom-right
- Popover with grid of dice buttons
- `Math.floor(Math.random() * sides) + 1` for roll
- Toast or inline display of result

### Files to create/modify
- `src/pages/PlayGame.tsx` — rewrite to hide content, add character tab
- `src/components/DiceRoller.tsx` — new floating dice component
- `src/pages/HostGame.tsx` — add DiceRoller
- Database migration: add UPDATE policy on `game_players`

