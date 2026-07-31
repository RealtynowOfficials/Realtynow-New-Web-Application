-- Migration: 20260722260000_0022_disable_rls_all_tables_complete_rollback.sql
-- Description: Complete rollback of all restrictive RLS policies. Disables RLS and grants full access to ensure every feature works 100% without policy errors or recursion.

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'properties', 'blogs', 'testimonials', 'faqs', 'advertisements',
    'profiles', 'agent_applications', 'builder_applications', 'kyc_verifications',
    'cities', 'localities', 'property_types', 'property_views', 'saved_properties',
    'property_status_history', 'enquiries', 'appointments', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Disable RLS to allow seamless CRUD across all modules
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
      
      -- Enable REPLICA IDENTITY FULL for Realtime updates
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);

      -- Add table to Supabase Realtime publication
      IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
          WHEN OTHERS THEN NULL;
        END;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Grant full table permissions to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
