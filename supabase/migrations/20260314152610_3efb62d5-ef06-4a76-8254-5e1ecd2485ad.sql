CREATE TABLE public.scenario_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id text NOT NULL,
  field text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, field)
);
ALTER TABLE public.scenario_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage scenario overrides"
  ON public.scenario_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Anyone can read scenario overrides"
  ON public.scenario_overrides FOR SELECT TO anon, authenticated
  USING (true);