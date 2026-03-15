ALTER TABLE public.profiles
  ADD COLUMN spotify_refresh_token text,
  ADD COLUMN spotify_access_token text,
  ADD COLUMN spotify_token_expires_at timestamptz;