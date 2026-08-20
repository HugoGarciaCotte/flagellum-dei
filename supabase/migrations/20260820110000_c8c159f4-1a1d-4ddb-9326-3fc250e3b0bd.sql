-- GM-01: restore the game master's view of players from previous sessions.
--
-- CROSS-04 (20260726034059) added `g.status <> 'ended'` to is_host_of_player /
-- is_host_of_character. Every finished session flips its game to 'ended'
-- (HostGame.endGame), so between sessions ALL of a GM's hosted games are ended
-- and the host arm of the characters SELECT policy ("Host can view all
-- characters of game players") matches nothing. GMPlayerList hides players
-- with zero visible characters, so the GM's player list rendered empty, and
-- GM edits / portrait generation for those characters were RLS-rejected
-- (SYNC_INVESTIGATION.md hypothesis 4).
--
-- SRV-04 left this as a product decision ("decide product-wise whether ended
-- games should retain visibility; if yes, at least require gp.deleted_at IS
-- NULL"). Decision: ended games DO retain host visibility — the GM curates
-- player characters between sessions. Revocation stays real where it matters:
-- both helpers keep requiring a non-soft-deleted game AND membership
-- (deleted_at IS NULL), so deleting a game or a membership still revokes host
-- access; only the normal 'ended' lifecycle state no longer does.
--
-- No data repair needed: game_players rows and games.status values are
-- consistent server-side — this was purely a visibility (RLS helper) bug.

CREATE OR REPLACE FUNCTION public.is_host_of_player(_player_user uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
      AND g.host_user_id = _viewer
      AND g.deleted_at IS NULL
    WHERE gp.user_id = _player_user
      AND gp.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_host_of_character(_character_id uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
      AND g.host_user_id = _viewer
      AND g.deleted_at IS NULL
    WHERE gp.character_id = _character_id
      AND gp.deleted_at IS NULL
  )
$$;
