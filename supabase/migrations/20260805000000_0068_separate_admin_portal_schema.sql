-- Migration: 20260805000000_0068_separate_admin_portal_schema.sql
-- Description: Independent Admin Portal database schema, columns migration, sessions, security audit logs, storage policies, and seed data.

-- 1. Create Admins Table if missing
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Admin User',
  email TEXT UNIQUE,
  mobile TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decouple admins table from profiles table (remove foreign key constraint from old migration 0066)
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_id_fkey;
ALTER TABLE public.admins ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure all necessary columns exist on `public.admins`
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Admin User';
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS mobile TEXT DEFAULT '';
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b';
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS otp TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS login_ip TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Drop old check constraints if present and update to expanded admin roles
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_status_check;
ALTER TABLE public.admins ADD CONSTRAINT admins_role_check CHECK (role IN ('super_admin', 'admin', 'moderator', 'support'));
ALTER TABLE public.admins ADD CONSTRAINT admins_status_check CHECK (status IN ('active', 'suspended', 'locked'));

-- Ensure unique constraint on email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_key'
  ) THEN
    ALTER TABLE public.admins ADD CONSTRAINT admins_email_key UNIQUE (email);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Admin Sessions Table
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  login_ip TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Admin Login History Table
CREATE TABLE IF NOT EXISTS public.admin_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE,
  ip TEXT,
  device TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance & security queries
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins (lower(email));
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON public.admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_admin_id ON public.admin_login_history (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs (admin_id, created_at DESC);

-- Disable strict RLS or set open policies
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs DISABLE ROW LEVEL SECURITY;

-- Storage & Admin Operations RLS Policies (Fixes "new row violates row-level security policy" on image upload, profile, and property updates)
DROP POLICY IF EXISTS "public_insert_profile_images" ON storage.objects;
CREATE POLICY "public_insert_profile_images" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "public_update_profile_images" ON storage.objects;
CREATE POLICY "public_update_profile_images" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "public_insert_property_images" ON storage.objects;
CREATE POLICY "public_insert_property_images" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'property-images');

DROP POLICY IF EXISTS "public_update_property_images" ON storage.objects;
CREATE POLICY "public_update_property_images" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "public_insert_blog_images" ON storage.objects;
CREATE POLICY "public_insert_blog_images" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "public_insert_advertisements" ON storage.objects;
CREATE POLICY "public_insert_advertisements" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'advertisements');

-- Allow Admin Portal updates to profiles table
DROP POLICY IF EXISTS "admin_portal_update_profiles" ON public.profiles;
CREATE POLICY "admin_portal_update_profiles" ON public.profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_portal_insert_profiles" ON public.profiles;
CREATE POLICY "admin_portal_insert_profiles" ON public.profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Allow Admin Portal updates to properties table
DROP POLICY IF EXISTS "admin_portal_update_properties" ON public.properties;
CREATE POLICY "admin_portal_update_properties" ON public.properties FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Update any pre-existing admin rows created by migration 0066 to ensure email & password exist
UPDATE public.admins
SET
  email = COALESCE(email, 'admin.anthati@realtynow.in'),
  name = CASE WHEN name IS NULL OR name = '' THEN 'Sekhar Anthati' ELSE name END,
  password_hash = 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b'
WHERE email IS NULL OR password_hash IS NULL OR password_hash = '';

-- Seed Default Accounts for each role
-- Note: Hashes represent SHA-256 / salted hash for password 'Sekhar.anthati@9774'
INSERT INTO public.admins (id, name, email, mobile, password_hash, role, status)
VALUES
  (gen_random_uuid(), 'Sekhar Anthati', 'admin.anthati@realtynow.in', '+919963509329', 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b', 'admin', 'active'),
  (gen_random_uuid(), 'Super Admin', 'superadmin@realtynow.com', '+919963509329', 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b', 'super_admin', 'active'),
  (gen_random_uuid(), 'System Admin', 'admin@realtynow.com', '+919876543210', 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b', 'admin', 'active'),
  (gen_random_uuid(), 'Property Moderator', 'moderator@realtynow.com', '+919876543211', 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b', 'moderator', 'active'),
  (gen_random_uuid(), 'Support Agent', 'support@realtynow.com', '+919876543212', 'c94c26244e5c08d5b81affea22d56f6b4ecff26b2a06a0fef4406fb2721c9c5b', 'support', 'active')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  mobile = EXCLUDED.mobile,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status;
