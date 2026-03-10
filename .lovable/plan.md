

## Problem: RLS Policies Block GM from Seeing Player Character Feats

The GM can see player **characters** (the `characters` table has a policy joining on `gp.user_id = characters.user_id`), but **cannot see their feats** because the `character_feats` and `character_feat_subfeats` RLS policies join through `game_players.character_id` — meaning only the **currently selected** character's feats are visible to the GM. If a player hasn't selected a character, or the GM is viewing a non-selected character, feats are invisible.

### Root Cause

```text
character_feats "Host can view" policy:
  gp.character_id = character_feats.character_id  ← only selected char

characters "Host can view all" policy:
  gp.user_id = characters.user_id  ← all chars of player ✓
```

The feat policies are too narrow — they should mirror the characters approach and join through `characters.user_id → game_players.user_id`.

### Fix: Update RLS Policies (4 migrations)

**1. Replace `character_feats` SELECT policy for hosts:**

Drop the current "Host can view game player character feats" and create a new one that joins through the character's `user_id` instead of `character_id`:

```sql
EXISTS (
  SELECT 1
  FROM characters c
  JOIN game_players gp ON gp.user_id = c.user_id
  JOIN games g ON g.id = gp.game_id
  WHERE c.id = character_feats.character_id
    AND g.host_user_id = auth.uid()
)
```

**2. Same fix for `character_feats` INSERT, UPDATE, DELETE host policies** — update all four to use the user_id join path.

**3. Same fix for `character_feat_subfeats` SELECT, INSERT, UPDATE, DELETE host policies** — update all four to join through `character_feats → characters → game_players.user_id`.

This makes the GM able to see and edit feats for **all** characters of any player in their games, not just the currently selected one. Guests are authenticated (anonymous sign-in), so their characters have a proper `user_id` — the issue is purely the narrow RLS join, not guest auth.

No code changes needed — only database policy updates.

