-- Migration: 20260803000000_0055_agent_requests.sql
-- Description: Supports the Agent/Builder tab of the MagicBricks-style OTP
--              login (src/pages/auth/otp-login.tsx): when a mobile number
--              verifies via OTP but has no agent/builder profile yet, the
--              otp-auth edge function logs a pending request here instead of
--              auto-creating an account. Admins review these in
--              AdminAgents (src/pages/admin/manage.tsx) and either approve
--              (provisions the account via the existing admin-provision
--              action, which also flips this row to 'approved') or reject.
--              No changes to profiles.role or existing RLS — reuses
--              public.is_admin() and public.handle_updated_at() from
--              0001/0029.

CREATE TABLE IF NOT EXISTS public.agent_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile         TEXT NOT NULL,
  full_name      TEXT,
  requested_role TEXT NOT NULL DEFAULT 'agent' CHECK (requested_role IN ('agent', 'builder')),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_requests_mobile ON public.agent_requests(mobile);
CREATE INDEX IF NOT EXISTS idx_agent_requests_status ON public.agent_requests(status);

ALTER TABLE public.agent_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write via the client. The public-facing insert (OTP
-- verified, no profile found) and the review action both go through the
-- otp-auth edge function using the service role, which bypasses RLS.
DROP POLICY IF EXISTS "agent_requests_admin_all" ON public.agent_requests;
CREATE POLICY "agent_requests_admin_all" ON public.agent_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_agent_requests_updated ON public.agent_requests;
CREATE TRIGGER trg_agent_requests_updated
  BEFORE UPDATE ON public.agent_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_requests;
  END IF;
END $$;
