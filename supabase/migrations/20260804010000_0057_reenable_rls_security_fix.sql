-- Migration: 20260804010000_0057_reenable_rls_security_fix.sql
-- Description: SECURITY FIX. Migration 0022 ("disable_rls_all_tables_complete
--              _rollback") disabled Row Level Security on 18 tables and
--              granted ALL privileges to anon + authenticated, as a blunt
--              workaround for RLS recursion bugs (see 0011/0018/0020/0021
--              history). No later migration re-enabled it — meaning, until
--              this migration, any holder of the public anon key could
--              read/write/delete any row in properties, profiles,
--              kyc_verifications, agent_applications, builder_applications,
--              audit_logs, and the rest of the list below.
--
--              This migration re-enables RLS on every one of those tables
--              with non-recursive policies built on the SECURITY DEFINER
--              helpers already fixed in 0029 (is_admin/is_staff/is_agent) —
--              the same pattern 0018 proved works, applied consistently
--              instead of the "just open everything" pattern from 0011/0020/
--              0021. Table-level GRANTs from 0022 are left as-is (standard
--              Supabase posture: RLS policies are the actual gate, not the
--              coarse-grained GRANT) — this migration only touches RLS
--              enablement and policies.
--
--              `saved_properties` (also in 0022's list) is intentionally
--              skipped: it was never created as a table anywhere in this
--              project's migration history (the app uses `favorites`
--              instead, which was never disabled and is unaffected).

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_clean" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_clean" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_clean" ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_own" ON public.profiles;
DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_agent_profiles" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (auth.uid() = id OR role IN ('agent', 'admin') OR public.is_staff());

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- properties
-- ============================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "properties_select_clean" ON public.properties;
DROP POLICY IF EXISTS "properties_select_own" ON public.properties;
DROP POLICY IF EXISTS "properties_select_public_or_own" ON public.properties;
DROP POLICY IF EXISTS "anon_select_published" ON public.properties;
DROP POLICY IF EXISTS "customer_select_published" ON public.properties;
DROP POLICY IF EXISTS "owner_select_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_select_properties" ON public.properties;
DROP POLICY IF EXISTS "authenticated_select_properties" ON public.properties;
DROP POLICY IF EXISTS "properties_insert" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_own" ON public.properties;
DROP POLICY IF EXISTS "properties_write_clean" ON public.properties;
DROP POLICY IF EXISTS "properties_update_own" ON public.properties;
DROP POLICY IF EXISTS "properties_update_staff" ON public.properties;
DROP POLICY IF EXISTS "owner_update_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_update_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_delete_properties" ON public.properties;

CREATE POLICY "properties_select" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR auth.uid() = owner_id
    OR auth.uid() = assigned_agent_id
    OR public.is_staff()
  );

CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.is_staff());

CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_agent_id OR public.is_staff())
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = assigned_agent_id OR public.is_staff());

CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin());

-- ============================================================
-- blogs
-- ============================================================
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blogs_read" ON public.blogs;
DROP POLICY IF EXISTS "blogs_read_public" ON public.blogs;
DROP POLICY IF EXISTS "blogs_write" ON public.blogs;
DROP POLICY IF EXISTS "blogs_admin_all" ON public.blogs;

CREATE POLICY "blogs_select" ON public.blogs
  FOR SELECT TO anon, authenticated
  USING (published = true OR auth.uid() = author_id OR public.is_admin());

CREATE POLICY "blogs_write" ON public.blogs
  FOR ALL TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

-- ============================================================
-- testimonials — write was never admin-gated historically; fixing that here
-- ============================================================
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials_read" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_write" ON public.testimonials;

CREATE POLICY "testimonials_select" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "testimonials_write_admin" ON public.testimonials
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- faqs — 0017's admin check had an "OR TRUE" bug; fixing that here
-- ============================================================
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs_read" ON public.faqs;
DROP POLICY IF EXISTS "faqs_read_all" ON public.faqs;
DROP POLICY IF EXISTS "faqs_write" ON public.faqs;
DROP POLICY IF EXISTS "faqs_admin_write" ON public.faqs;

CREATE POLICY "faqs_select" ON public.faqs
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "faqs_write_admin" ON public.faqs
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- advertisements
-- ============================================================
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_ads" ON public.advertisements;
DROP POLICY IF EXISTS "admin_all_ads" ON public.advertisements;

CREATE POLICY "advertisements_select" ON public.advertisements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "advertisements_write_admin" ON public.advertisements
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- agent_applications / builder_applications — anonymous pre-auth forms,
-- no user_id column exists on either table; admin-only review.
-- ============================================================
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_app_insert_anon" ON public.agent_applications;
DROP POLICY IF EXISTS "agent_app_admin" ON public.agent_applications;

CREATE POLICY "agent_applications_insert" ON public.agent_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "agent_applications_admin" ON public.agent_applications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.builder_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "builder_app_insert_anon" ON public.builder_applications;
DROP POLICY IF EXISTS "builder_app_admin" ON public.builder_applications;

CREATE POLICY "builder_applications_insert" ON public.builder_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "builder_applications_admin" ON public.builder_applications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- kyc_verifications
-- ============================================================
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_owner" ON public.kyc_verifications;
DROP POLICY IF EXISTS "kyc_admin" ON public.kyc_verifications;

CREATE POLICY "kyc_owner" ON public.kyc_verifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_admin" ON public.kyc_verifications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- cities / localities / property_types — master data.
-- Write was never admin-gated historically; fixing that here.
-- ============================================================
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cities_read" ON public.cities;
DROP POLICY IF EXISTS "cities_write" ON public.cities;
CREATE POLICY "cities_select" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cities_write_admin" ON public.cities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "localities_read" ON public.localities;
DROP POLICY IF EXISTS "localities_write" ON public.localities;
CREATE POLICY "localities_select" ON public.localities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "localities_write_admin" ON public.localities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ptypes_read" ON public.property_types;
DROP POLICY IF EXISTS "ptypes_write" ON public.property_types;
CREATE POLICY "property_types_select" ON public.property_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "property_types_write_admin" ON public.property_types FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- property_views — open analytics ping, scoped read
-- ============================================================
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pviews_insert" ON public.property_views;
DROP POLICY IF EXISTS "pviews_owner_read" ON public.property_views;

CREATE POLICY "property_views_insert" ON public.property_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "property_views_select" ON public.property_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (p.owner_id = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
    OR public.is_staff()
  );

-- ============================================================
-- property_status_history — read scoped to owner/agent/staff;
-- direct client INSERT restricted to staff (the normal path is the
-- SECURITY DEFINER trigger fn_on_property_status_change, which runs
-- with the table owner's privileges and is unaffected by this policy).
-- ============================================================
ALTER TABLE public.property_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pstatus_select" ON public.property_status_history;
DROP POLICY IF EXISTS "pstatus_insert" ON public.property_status_history;

CREATE POLICY "property_status_history_select" ON public.property_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (p.owner_id = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
    OR public.is_staff()
  );

CREATE POLICY "property_status_history_insert_staff" ON public.property_status_history
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- ============================================================
-- enquiries
-- ============================================================
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquiries_insert" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries_select" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries_update" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries_delete" ON public.enquiries;

CREATE POLICY "enquiries_insert" ON public.enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "enquiries_select" ON public.enquiries
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    OR public.is_staff()
  );

CREATE POLICY "enquiries_update" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    OR public.is_staff()
  )
  WITH CHECK (true);

CREATE POLICY "enquiries_delete_admin" ON public.enquiries
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- appointments — never wiped by earlier "open everything" migrations;
-- restoring the original policies verbatim plus staff visibility.
-- ============================================================
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;

CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = agent_id OR public.is_staff());

CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = agent_id OR public.is_staff())
  WITH CHECK (true);

CREATE POLICY "appointments_delete_admin" ON public.appointments
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- audit_logs — append-only: INSERT open (it's a trail written by both
-- client actions and SECURITY DEFINER helpers), SELECT admin-only, no
-- UPDATE/DELETE policy at all (immutable by design, even for admins).
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.audit_logs;

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());
