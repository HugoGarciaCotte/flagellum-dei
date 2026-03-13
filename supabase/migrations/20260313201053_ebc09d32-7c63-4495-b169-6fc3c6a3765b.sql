
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL DEFAULT 'fr',
  value text NOT NULL,
  screen text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, locale)
);
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations" ON public.translations
  FOR SELECT TO public USING (true);

CREATE POLICY "Owner can manage translations" ON public.translations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
