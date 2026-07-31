-- Migration: 20260722220000_0018_fix_admin_properties_rls_recursion.sql
-- Description: Fix RLS policy on properties and profiles tables to allow Admin full write/upsert operations.

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_update_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_delete_properties" ON public.properties;
DROP POLICY IF EXISTS "authenticated_select_properties" ON public.properties;

-- 1. Admin Policies using SECURITY DEFINER is_admin()
CREATE POLICY "admin_select_properties" ON public.properties
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_update_properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_properties" ON public.properties
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 2. Authenticated Reading Policy (Ensures property listings are accessible across portal)
CREATE POLICY "authenticated_select_properties" ON public.properties
  FOR SELECT TO authenticated
  USING (true);

-- 3. Enable REPLICA IDENTITY FULL & Realtime for properties
ALTER TABLE public.properties REPLICA IDENTITY FULL;

-- 4. Admin full access to profiles table (so admin can create, update, and manage agents)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;
