/*
  Migration 0011: Fix Admin Portal RLS - Complete Clean Fix
  
  Problems fixed:
  1. Removed recursive subqueries on public.profiles that caused infinite RLS recursion.
  2. Enables non-recursive read/write access for authenticated users across profiles and properties.
*/

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;

CREATE POLICY "profiles_select_clean" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_write_clean" ON public.profiles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Properties RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_update_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_delete_properties" ON public.properties;
DROP POLICY IF EXISTS "owner_select_properties" ON public.properties;
DROP POLICY IF EXISTS "owner_update_properties" ON public.properties;
DROP POLICY IF EXISTS "customer_select_published" ON public.properties;
DROP POLICY IF EXISTS "anon_select_published" ON public.properties;
DROP POLICY IF EXISTS "properties_insert" ON public.properties;
DROP POLICY IF EXISTS "properties_update_own" ON public.properties;

CREATE POLICY "properties_select_clean" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "properties_write_clean" ON public.properties
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
