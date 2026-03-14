CREATE TABLE public.feat_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feat_id text NOT NULL,
  field text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feat_id, field)
);

ALTER TABLE public.feat_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage feat overrides"
  ON public.feat_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Anyone can read feat overrides"
  ON public.feat_overrides FOR SELECT TO anon, authenticated
  USING (true);