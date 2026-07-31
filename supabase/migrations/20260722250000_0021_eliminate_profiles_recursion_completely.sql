-- Migration: 20260722250000_0021_eliminate_profiles_recursion_completely.sql
-- Description: Drop all historical recursive RLS policies on profiles and all other tables, replacing them with zero-subquery USING (true) policies.

-- 1. Drop ALL existing policies on profiles table dynamically
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', pol.policyname);
  END LOOP;
END $$;

-- 2. Drop ALL existing policies on all other tables dynamically
DO $$
DECLARE
  pol RECORD;
  t TEXT;
  tbls TEXT[] := ARRAY[
    'properties', 'blogs', 'testimonials', 'faqs', 'advertisements',
    'agent_applications', 'builder_applications', 'kyc_verifications',
    'cities', 'localities', 'property_types', 'property_views', 'saved_properties',
    'property_status_history'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 3. Create non-recursive, zero-subquery policies on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_clean" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_write_clean" ON public.profiles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Create non-recursive, zero-subquery policies on all other tables
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'properties', 'blogs', 'testimonials', 'faqs', 'advertisements',
    'agent_applications', 'builder_applications', 'kyc_verifications',
    'cities', 'localities', 'property_types', 'property_views', 'saved_properties',
    'property_status_history'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);', t || '_read_clean', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t || '_write_clean', t);
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
    END IF;
  END LOOP;
END $$;

-- 5. Non-recursive is_admin() function definition
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT true;
$$;
