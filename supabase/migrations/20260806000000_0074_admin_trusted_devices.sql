-- Migration: 20260806000000_0074_admin_trusted_devices.sql
-- Description: Creates a table to store trusted devices for admins, enabling 2FA OTP bypass for a specified duration (e.g. 30 days).

CREATE TABLE IF NOT EXISTS public.admin_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  device_token TEXT UNIQUE NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_token ON public.admin_trusted_devices (device_token);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_admin_id ON public.admin_trusted_devices (admin_id);

-- Disable strict RLS to allow the auth logic to manage trusted devices without an active session
ALTER TABLE public.admin_trusted_devices DISABLE ROW LEVEL SECURITY;
