-- Migration: 20260817110000_0109_allow_developer_admin_access.sql
-- Description: Authorize Developer (9963509329) alongside existing Manager for the single Admin role.
-- Both Manager and Developer have full, identical Admin portal access.

-- 1. Ensure any existing profiles for the Developer mobile number are set to role 'admin' and status 'active'
UPDATE public.profiles
SET
  role = 'admin',
  status = 'active',
  is_mobile_verified = true,
  updated_at = now()
WHERE phone IN ('9963509329', '+919963509329', '919963509329');

-- 2. Upsert into public.admins table for the Developer profile
INSERT INTO public.admins (id, mobile, role, status, created_at, updated_at)
SELECT
  p.id,
  COALESCE(p.phone, '919963509329'),
  'admin',
  'active',
  now(),
  now()
FROM public.profiles p
WHERE p.phone IN ('9963509329', '+919963509329', '919963509329')
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = now();
