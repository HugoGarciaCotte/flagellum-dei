
CREATE TABLE public.feat_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_title text NOT NULL UNIQUE,
  to_title text NOT NULL
);

ALTER TABLE public.feat_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feat redirects" ON public.feat_redirects FOR SELECT USING (true);

CREATE POLICY "Admins can insert feat redirects" ON public.feat_redirects FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feat redirects" ON public.feat_redirects FOR UPDATE USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete feat redirects" ON public.feat_redirects FOR DELETE USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
