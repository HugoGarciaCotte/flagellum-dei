-- LOG-01: durable server-side sync error log.
-- Clients append fire-and-forget from src/lib/syncErrorReporter.ts so the GM
-- can inspect players' sync failures after a session. Append-only for clients:
-- INSERT for any authenticated user (incl. anonymous-auth players) on their own
-- rows; SELECT restricted to owner/admin; no UPDATE/DELETE policies at all.

CREATE TABLE public.sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  -- When the error occurred on the device (device clock).
  at timestamptz NOT NULL,
  table_name text NOT NULL DEFAULT '',
  row_ids text[] NOT NULL DEFAULT '{}',
  message text NOT NULL CHECK (char_length(message) <= 2000),
  -- Client-side collapsed repeat count for identical consecutive errors.
  count integer NOT NULL DEFAULT 1 CHECK (count >= 1),
  device jsonb,
  -- When the row reached the server (uploads are queued while offline).
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own sync errors"
  ON public.sync_errors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read sync errors"
  ON public.sync_errors FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX sync_errors_created_at_idx ON public.sync_errors (created_at DESC);
CREATE INDEX sync_errors_user_id_idx ON public.sync_errors (user_id);
