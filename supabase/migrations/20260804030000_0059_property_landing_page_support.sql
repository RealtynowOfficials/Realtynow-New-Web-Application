-- Migration: 20260804030000_0059_property_landing_page_support.sql
-- Description: Support tables/fixes for the Premium Property Landing Page
--              redesign (src/pages/public/property-detail.tsx).
--
--              1. RLS fix for property_virtual_tours + virtual_tour_analytics
--                 — migration 0025 explicitly disabled RLS on both ("Disable
--                 RLS for smooth access") with no owner/staff scoping at all,
--                 same anti-pattern as the 0022 incident fixed in migration
--                 0057. Found while wiring the (previously unused) virtual
--                 tour viewer into the public property page. Tour images are
--                 meant to be public read (same as property photos), but
--                 writes were fully open to anon — anyone could deface or
--                 delete any property's tour.
--              2. property_reports — new "Report Property" feature.
--              3. property_page_settings — new site-wide admin controls for
--                 which landing-page sections are shown (the "Admin controls
--                 all page sections... from the Admin Panel" requirement).
--                 Deliberately a single global settings row, not a
--                 per-property content-block builder — that would be a much
--                 larger, separate project.

-- ============================================================
-- 1. property_virtual_tours / virtual_tour_analytics — re-enable RLS
-- ============================================================
ALTER TABLE public.property_virtual_tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "virtual_tours_select" ON public.property_virtual_tours;
CREATE POLICY "virtual_tours_select" ON public.property_virtual_tours
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "virtual_tours_write" ON public.property_virtual_tours;
CREATE POLICY "virtual_tours_write" ON public.property_virtual_tours
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (p.owner_id = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
    OR public.is_staff()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (p.owner_id = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
    OR public.is_staff()
  );

ALTER TABLE public.virtual_tour_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "virtual_tour_analytics_insert" ON public.virtual_tour_analytics;
CREATE POLICY "virtual_tour_analytics_insert" ON public.virtual_tour_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "virtual_tour_analytics_select" ON public.virtual_tour_analytics;
CREATE POLICY "virtual_tour_analytics_select" ON public.virtual_tour_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (p.owner_id = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
    OR public.is_staff()
  );

-- ============================================================
-- 2. property_reports — "Report Property"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.property_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reporter_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL,
  details      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_reports_property ON public.property_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_status ON public.property_reports(status);

ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_reports_insert" ON public.property_reports;
CREATE POLICY "property_reports_insert" ON public.property_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "property_reports_admin" ON public.property_reports;
CREATE POLICY "property_reports_admin" ON public.property_reports
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 3. property_page_settings — admin section-visibility controls
-- ============================================================
CREATE TABLE IF NOT EXISTS public.property_page_settings (
  id                      BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true), -- single-row table
  show_specifications     BOOLEAN NOT NULL DEFAULT true,
  show_amenities          BOOLEAN NOT NULL DEFAULT true,
  show_floor_plans        BOOLEAN NOT NULL DEFAULT true,
  show_gallery            BOOLEAN NOT NULL DEFAULT true,
  show_videos             BOOLEAN NOT NULL DEFAULT true,
  show_virtual_tour       BOOLEAN NOT NULL DEFAULT true,
  show_location_map       BOOLEAN NOT NULL DEFAULT true,
  show_nearby             BOOLEAN NOT NULL DEFAULT true,
  show_price_history      BOOLEAN NOT NULL DEFAULT true,
  show_reviews            BOOLEAN NOT NULL DEFAULT true,
  show_faqs               BOOLEAN NOT NULL DEFAULT true,
  show_similar_properties BOOLEAN NOT NULL DEFAULT true,
  show_emi_calculator     BOOLEAN NOT NULL DEFAULT true,
  promo_banner_title      TEXT,
  promo_banner_body       TEXT,
  promo_banner_link       TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.property_page_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.property_page_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_page_settings_select" ON public.property_page_settings;
CREATE POLICY "property_page_settings_select" ON public.property_page_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "property_page_settings_admin_write" ON public.property_page_settings;
CREATE POLICY "property_page_settings_admin_write" ON public.property_page_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.property_page_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
