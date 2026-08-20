# Fix: "My players" list shows nobody for hugo@garcia-cotte.com

## What's actually happening

The data is intact. In the database, your account hosts 20+ games, and those games hold 42 player memberships (7 players in the last session alone, with named characters like Laëtitia, Hérétoc, Chen, King Wattus, Sheethal...).

Two things combine to hide them:

1. **All but one of your games have status `ended`.** The database rule that lets a game master read his players' characters (`is_host_of_player`) explicitly excludes ended games. So once a session ends, their characters become invisible to you.
2. **The player list drops any player whose characters it can't see.** `GMPlayerList` skips entries with zero characters, so every player from an ended game disappears — and since the only still-active game contains just you, the list ends up empty and renders nothing.

## The fix

### 1. Let hosts keep reading past players' characters (backend)

Change the read-side helpers so history is preserved, while write access stays limited to live games:

- `is_host_of_player` / `is_host_of_character` for **SELECT**: drop the `status <> 'ended'` condition — a host can read the characters of anyone who ever joined one of his (non-deleted) games.
- Keep **UPDATE** on `characters` restricted to players in games that are not ended, via a separate helper (`is_active_host_of_player`), so a GM can't edit sheets from an archived session.

This is a migration on the existing security-definer functions and the `characters` policies. No schema or data changes.

### 2. Don't hide players without a character (frontend)

In `src/components/GMPlayerList.tsx`, remove the `if (chars.length === 0) continue;` skip. The component already renders a "no character selected" line for that case, so guests who joined without a sheet appear instead of vanishing.

### 3. Make past sessions visible in the list

Players are grouped by user across all hosted games, so once (1) and (2) land, the historical roster returns. Sort entries so players from the most recent games appear first.

## Technical notes

- Migration touches: `public.is_host_of_player`, `public.is_host_of_character`, new `public.is_active_host_of_player`, and the `characters` SELECT/UPDATE policies.
- Local cache: `evictStaleGames` already preserves games you host, so ended sessions stay in the offline store; after the migration a normal sync pull will repopulate the characters.
- No change to what players can see about each other.
