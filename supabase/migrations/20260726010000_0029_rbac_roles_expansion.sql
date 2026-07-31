-- =============================================================================
-- Migration: 20260726010000_0029_rbac_roles_expansion.sql
-- Description: Enterprise RBAC expansion — fixes is_admin() security bug,
--              adds sales_executive, verification_executive, super_admin roles,
--              permissions table, role_permissions mapping, and staff_profiles.
-- =============================================================================

-- ============================================================
-- 1. EXPAND profiles.role CHECK CONSTRAINT
-- ============================================================
-- Remove old constraint and add expanded one
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer','agent','admin','sales_executive','verification_executive','super_admin','builder'));

-- ============================================================
-- 2. FIX is_admin() — was returning TRUE unconditionally (security bug)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND status = 'active'
  );
END;
$$;

-- ============================================================
-- 3. HELPER ROLE FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_sales_executive()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'sales_executive'
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_verification_executive()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'verification_executive'
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'agent'
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'sales_executive', 'verification_executive')
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'customer');
END;
$$;

-- ============================================================
-- 4. PERMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  module      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_read" ON public.permissions;
CREATE POLICY "permissions_read" ON public.permissions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "permissions_admin_write" ON public.permissions;
CREATE POLICY "permissions_admin_write" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. ROLE_PERMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('customer','agent','admin','sales_executive','verification_executive','super_admin','builder')),
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_read" ON public.role_permissions;
CREATE POLICY "role_permissions_read" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_permissions_admin_write" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_write" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6. STAFF PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id     TEXT UNIQUE,
  department      TEXT,
  designation     TEXT,
  reporting_to    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  territory       TEXT[],
  joined_at       DATE,
  can_approve     BOOLEAN NOT NULL DEFAULT false,
  can_verify      BOOLEAN NOT NULL DEFAULT false,
  max_leads       INT DEFAULT 50,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_profiles_self_read" ON public.staff_profiles;
CREATE POLICY "staff_profiles_self_read" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "staff_profiles_admin_write" ON public.staff_profiles;
CREATE POLICY "staff_profiles_admin_write" ON public.staff_profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Updated_at trigger for staff_profiles
CREATE OR REPLACE FUNCTION public.handle_staff_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS on_staff_updated_at ON public.staff_profiles;
CREATE TRIGGER on_staff_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_staff_updated_at();

-- ============================================================
-- 7. SEED PERMISSIONS
-- ============================================================
INSERT INTO public.permissions (name, description, module) VALUES
  -- Properties
  ('properties.view_all',       'View all properties regardless of status',     'properties'),
  ('properties.create',         'Create new property listings',                 'properties'),
  ('properties.edit_own',       'Edit own property listings',                   'properties'),
  ('properties.edit_any',       'Edit any property listing',                    'properties'),
  ('properties.delete_own',     'Delete own property listings',                 'properties'),
  ('properties.delete_any',     'Delete any property listing',                  'properties'),
  ('properties.approve',        'Approve property listings',                    'properties'),
  ('properties.reject',         'Reject property listings',                     'properties'),
  ('properties.verify',         'Verify property documents/details',            'properties'),
  ('properties.feature',        'Mark properties as featured',                  'properties'),
  -- Leads / CRM
  ('leads.view_own',            'View own assigned leads',                      'crm'),
  ('leads.view_all',            'View all leads in the system',                 'crm'),
  ('leads.assign',              'Assign leads to agents/executives',            'crm'),
  ('leads.transfer',            'Transfer leads between agents',                'crm'),
  ('leads.close',               'Mark leads as won/lost/closed',                'crm'),
  -- Users
  ('users.view',                'View user profiles',                           'users'),
  ('users.edit',                'Edit user profiles',                           'users'),
  ('users.suspend',             'Suspend user accounts',                        'users'),
  ('users.delete',              'Delete user accounts',                         'users'),
  -- Agents
  ('agents.view',               'View agent profiles and performance',          'agents'),
  ('agents.approve',            'Approve agent applications',                   'agents'),
  ('agents.manage_packages',    'Manage agent subscription packages',           'agents'),
  -- Payments
  ('payments.view_own',         'View own payment history',                     'payments'),
  ('payments.view_all',         'View all payment transactions',                'payments'),
  ('payments.refund',           'Issue payment refunds',                        'payments'),
  ('payments.manage_invoices',  'Create and manage invoices',                   'payments'),
  -- Analytics
  ('analytics.view_own',        'View own analytics data',                      'analytics'),
  ('analytics.view_all',        'View platform-wide analytics',                 'analytics'),
  ('analytics.export',          'Export analytics reports',                     'analytics'),
  -- CMS
  ('cms.view',                  'View CMS content',                             'cms'),
  ('cms.edit',                  'Edit CMS content',                             'cms'),
  ('cms.publish',               'Publish CMS content',                          'cms'),
  -- Banners
  ('banners.view',              'View banner advertisements',                   'banners'),
  ('banners.manage',            'Create and manage banner ads',                 'banners'),
  ('banners.approve',           'Approve banner ad requests',                   'banners'),
  -- Settings
  ('settings.view',             'View system settings',                         'settings'),
  ('settings.edit',             'Edit system settings',                         'settings'),
  -- Notifications
  ('notifications.send',        'Send system notifications to users',           'notifications'),
  ('notifications.manage',      'Manage notification templates',                'notifications'),
  -- Reports
  ('reports.view',              'View generated reports',                       'reports'),
  ('reports.generate',          'Generate new reports',                         'reports'),
  ('reports.export',            'Export reports to CSV/PDF',                    'reports'),
  -- AI
  ('ai.use_basic',              'Use basic AI features',                        'ai'),
  ('ai.use_advanced',           'Use advanced AI tools (pricing, fraud)',       'ai'),
  ('ai.manage',                 'Manage AI settings and quotas',                'ai'),
  -- KYC
  ('kyc.view',                  'View KYC submissions',                         'kyc'),
  ('kyc.verify',                'Approve/reject KYC verifications',             'kyc')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 8. SEED ROLE-PERMISSION MAPPINGS
-- ============================================================

-- Super Admin: all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Admin: all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Sales Executive
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'sales_executive', id FROM public.permissions
WHERE name IN (
  'properties.view_all','leads.view_own','leads.view_all','leads.assign','leads.transfer',
  'leads.close','users.view','agents.view','payments.view_own',
  'analytics.view_own','analytics.export','reports.view','reports.generate','reports.export',
  'ai.use_basic','notifications.send'
)
ON CONFLICT DO NOTHING;

-- Verification Executive
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'verification_executive', id FROM public.permissions
WHERE name IN (
  'properties.view_all','properties.verify','properties.approve','properties.reject',
  'kyc.view','kyc.verify','users.view','analytics.view_own'
)
ON CONFLICT DO NOTHING;

-- Agent
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'agent', id FROM public.permissions
WHERE name IN (
  'properties.create','properties.edit_own','properties.delete_own',
  'leads.view_own','leads.close',
  'payments.view_own','analytics.view_own','ai.use_basic','cms.view'
)
ON CONFLICT DO NOTHING;

-- Customer
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'customer', id FROM public.permissions
WHERE name IN (
  'properties.create','properties.edit_own','properties.delete_own',
  'payments.view_own','ai.use_basic','cms.view'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. UPDATE RLS — PROPERTIES: allow staff to see all statuses
-- ============================================================
DROP POLICY IF EXISTS "properties_select_public_or_own" ON public.properties;
CREATE POLICY "properties_select_public_or_own" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR auth.uid() = owner_id
    OR auth.uid() = assigned_agent_id
    OR public.is_staff()
  );

-- Staff can update any property (for approval workflow)
DROP POLICY IF EXISTS "properties_update_staff" ON public.properties;
CREATE POLICY "properties_update_staff" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR auth.uid() = assigned_agent_id
    OR public.is_staff()
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR auth.uid() = assigned_agent_id
    OR public.is_staff()
  );

-- ============================================================
-- 10. GRANT EXECUTE ON HELPER FUNCTIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales_executive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verification_executive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT ALL ON public.permissions TO authenticated, service_role;
GRANT ALL ON public.role_permissions TO authenticated, service_role;
GRANT ALL ON public.staff_profiles TO authenticated, service_role;

-- ============================================================
-- 11. REALTIME PUBLICATION
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.permissions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
