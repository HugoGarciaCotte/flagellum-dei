DROP POLICY IF EXISTS "Host can update game player characters" ON public.characters;

CREATE POLICY "Host can update game player characters"
ON public.characters
FOR UPDATE
TO authenticated
USING (public.is_host_of_player(user_id, auth.uid()))
WITH CHECK (public.is_host_of_player(user_id, auth.uid()));

DROP FUNCTION IF EXISTS public.is_active_host_of_player(uuid, uuid);