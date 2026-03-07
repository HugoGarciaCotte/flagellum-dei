
CREATE POLICY "Users can become game master"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'game_master');
