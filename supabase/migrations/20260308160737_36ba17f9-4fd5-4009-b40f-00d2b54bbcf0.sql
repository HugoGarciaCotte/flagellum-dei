
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access on app-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'app-assets');

CREATE POLICY "Authenticated upload to app-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-assets');
