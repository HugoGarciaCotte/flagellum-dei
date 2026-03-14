-- Allow owners to upload to app-assets bucket
CREATE POLICY "Owner can upload app assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'owner'::public.app_role));

-- Allow owners to update/overwrite in app-assets bucket
CREATE POLICY "Owner can update app assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'owner'::public.app_role));

-- Allow owners to delete from app-assets bucket
CREATE POLICY "Owner can delete app assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'owner'::public.app_role));