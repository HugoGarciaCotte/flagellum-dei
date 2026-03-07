

## Add Game Master Role Upgrade Flow

### Current State
- `app_role` enum: `owner | admin | user`
- By default users have no role in `user_roles` table — the "Host a Game" collapsible is visible to everyone

### Plan

#### 1. Database Migration — Add `game_master` to `app_role` enum
```sql
ALTER TYPE public.app_role ADD VALUE 'game_master';
```
Also add an RLS policy so authenticated users can insert their own `game_master` role (self-promotion):
```sql
CREATE POLICY "Users can become game master"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'game_master');
```

#### 2. New hook `src/hooks/useIsGameMaster.ts`
- Query `user_roles` for `role = 'game_master'` for current user
- Return `{ isGameMaster, isLoading }`

#### 3. Update `src/pages/Dashboard.tsx`
- Import `useIsGameMaster` and a new `BecomeGMDialog` state
- Replace the "Host a Game" collapsible section:
  - **If NOT game master**: Show a "Become a Game Master" button that opens a dialog explaining: "You are currently a player. As a Game Master, you can host games and guide other players through scenarios. Would you like to become a Game Master?"
    - Confirm button inserts `{ user_id, role: 'game_master' }` into `user_roles`
    - On success, invalidate the query and the host section appears
  - **If game master**: Show the existing "Host a Game" collapsible with scenarios as-is

#### 4. Files Changed
- **Migration**: Add `game_master` enum value + RLS policy for self-assignment
- **`src/hooks/useIsGameMaster.ts`**: New file, similar to `useIsOwner`
- **`src/pages/Dashboard.tsx`**: Conditional rendering based on GM status, add become-GM dialog with mutation

