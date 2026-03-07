CREATE TABLE public.feats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  content text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feats" ON public.feats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert feats" ON public.feats FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update feats" ON public.feats FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete feats" ON public.feats FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));