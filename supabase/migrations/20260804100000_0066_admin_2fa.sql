-- Migration: 20260804100000_0066_admin_2fa.sql
-- Description: Second-factor "Secret Access Code" for the admin panel, layered on top of the
-- existing Supabase Auth mobile-OTP login (src/pages/auth/otp-login.tsx, supabase/functions/
-- otp-auth). Admins still authenticate via mobile OTP exactly as today; these tables back an
-- additional secret-code gate the admin-security edge function enforces before the admin
-- dashboard unlocks. All writes go through that edge function (service role) — no table here
-- has a client-facing write policy, and admin_security (the code hash) has no client-facing
-- read policy at all.

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  mobile TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_security (
  admin_id UUID PRIMARY KEY REFERENCES public.admins(id) ON DELETE CASCADE,
  secret_code_hash TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  ip TEXT,
  device TEXT,
  action TEXT NOT NULL CHECK (action IN ('otp_login', 'secret_setup', 'secret_verify', 'secret_reset', 'logout')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_logs_admin_id ON public.admin_login_logs (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admins_status ON public.admins (status);

-- Backfill: every profile that's already an admin today becomes a super_admin here so the
-- rollout never locks anyone out. They can create ordinary 'admin' accounts (or demote
-- themselves) from the new Security Settings page once it ships.
INSERT INTO public.admins (id, mobile, role, status)
SELECT p.id, COALESCE(p.phone, ''), 'super_admin', 'active'
FROM public.profiles p
WHERE p.role = 'admin'
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_logs ENABLE ROW LEVEL SECURITY;

-- Self-read only; all writes (including admin management by a super_admin) go through the
-- admin-security edge function using the service role, which authorizes super_admin actions
-- in application code rather than a self-referencing RLS policy.
DROP POLICY IF EXISTS "admins_self_select" ON public.admins;
CREATE POLICY "admins_self_select" ON public.admins
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- No policies on admin_security at all — it holds the secret code hash, so only the
-- service-role edge function (which bypasses RLS) can ever read or write it.

-- No client-facing policies on admin_login_logs either — viewed only via the
-- admin-security edge function's list-login-logs action (super_admin only).
