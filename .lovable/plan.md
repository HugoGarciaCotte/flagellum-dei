

## Bug: Game Players Query Failing (400 Error)

The player count always shows 0 because every request to fetch game players is failing with a **400 error**:

> "Could not find a relationship between 'game_players' and 'user_id' in the schema cache"

### Root Cause

The query in `HostGame.tsx` (and `PlayGame.tsx`) does:
```typescript
.select("*, profiles:user_id(display_name)")
```

This tells PostgREST to join `game_players.user_id` to the `profiles` table, but there is **no foreign key** between `game_players.user_id` and `profiles`. Without a FK, PostgREST cannot resolve the join.

### Fix (Two Parts)

**1. Database migration** -- Add a foreign key from `game_players.user_id` to `profiles.user_id`:
```sql
ALTER TABLE public.game_players
  ADD CONSTRAINT game_players_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
```

Also need a unique constraint on `profiles.user_id` if one doesn't exist (required for FK target):
```sql
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
```

**2. Code change** -- The join syntax `profiles:user_id(display_name)` should work once the FK exists. No code changes needed if the FK is added.

### Files Affected
- Database migration only (no code changes required)
- The fix will resolve the 400 errors in both `HostGame.tsx` and `PlayGame.tsx`

### Also: Letters-only join codes
While here, update `src/pages/Dashboard.tsx` line ~113 to generate letters-only codes:
```typescript
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const code = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 26)]).join("");
```

