
-- Add portrait_url to characters
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS portrait_url text;

-- Create character-portraits storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('character-portraits', 'character-portraits', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own portraits"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'character-portraits' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: authenticated users can update their own portraits
CREATE POLICY "Users can update own portraits"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'character-portraits' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: authenticated users can delete their own portraits
CREATE POLICY "Users can delete own portraits"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'character-portraits' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can view portraits (public bucket)
CREATE POLICY "Anyone can view portraits"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'character-portraits');
