# Restore GM editing of player character sheets

## Confirmed issue

The live `characters` write policy currently authorizes a GM through `is_active_host_of_player`. That helper rejects edits once the shared game is ended, even though the GM can still view the player and open the editable character sheet. The sync engine detects the zero-row update and correctly parks it as `rls-rejected`.

## Changes

1. **Widen the character update policy.** Replace the active-game-only authorization with `is_host_of_player(user_id, auth.uid())`, allowing a GM to edit characters belonging to players in any non-deleted game they host, including ended games.
2. **Keep ownership secure.** Preserve the existing player's self-edit policy and require both the old and resulting `user_id` to remain within the GM's hosted-player scope, preventing a character from being reassigned to an unrelated user.
3. **Remove the obsolete helper.** Drop `is_active_host_of_player` after confirming no remaining policy or code depends on it.
4. **Recover the refused edits.** Retry the two parked character changes through the existing Sync Issues repair flow after the policy is live; do not discard the GM's edits.

## Verification

- Sign in as the GM and edit another player's character sheet through the real UI.
- Confirm the update succeeds, the database row contains the edit, and no new `rls-rejected` entry appears.
- Repeat against a player from an ended hosted game.
- Attempt the same update as an unrelated authenticated user and confirm it remains denied.
- Confirm a caller cannot change the character's `user_id` to someone outside the GM's hosted players.
- Run the targeted sync tests and backend security checks.

## Technical detail

This is a backend access-policy migration. The existing GM editing UI and local-first save path remain intact; no controls will be hidden or disabled.
