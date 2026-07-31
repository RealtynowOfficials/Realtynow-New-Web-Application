-- =============================================================================
-- Migration: 20260726060000_0034_analytics_reporting.sql
-- Description: Partitioned analytics events table, daily snapshot system,
--              revenue reporting, materialized KPI views, and report generation
--              functions for admin/agent/sales dashboards.
-- =============================================================================

-- ============================================================
-- FIX: Add missing columns to advertisements table
-- ============================================================
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS impressions INT DEFAULT 0;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0;

-- ============================================================
-- 1. ANALYTICS EVENTS TABLE (Partitioned by month)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    TEXT,
  property_id   UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  city_id       UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  locality_id   UUID REFERENCES public.localities(id) ON DELETE SET NULL,
  page_url      TEXT,
  referrer      TEXT,
  device_type   TEXT CHECK (device_type IN ('desktop','mobile','tablet') OR device_type IS NULL),
  browser       TEXT,
  os            TEXT,
  ip_address    INET,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create 2026 partitions by month
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_01 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_02 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_03 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_04 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_05 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_06 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_07 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_08 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_09 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_10 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_11 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_12 PARTITION OF public.analytics_events FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2027_q1 PARTITION OF public.analytics_events FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS public.analytics_events_2027_q2 PARTITION OF public.analytics_events FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_events_insert" ON public.analytics_events;
CREATE POLICY "analytics_events_insert" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events_admin_read" ON public.analytics_events;
CREATE POLICY "analytics_events_admin_read" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_ae_event_type  ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ae_user_id     ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ae_property_id ON public.analytics_events(property_id);
CREATE INDEX IF NOT EXISTS idx_ae_agent_id    ON public.analytics_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_ae_created_at  ON public.analytics_events(created_at DESC);

-- ============================================================
-- 2. fn_track_event() — Universal event tracker
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_track_event(
  p_event_type  TEXT,
  p_property_id UUID DEFAULT NULL,
  p_agent_id    UUID DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_type, user_id, property_id, agent_id, metadata)
  VALUES (p_event_type, auth.uid(), p_property_id, p_agent_id, p_metadata);
EXCEPTION WHEN OTHERS THEN
  NULL; -- Never block the user operation for analytics
END;
$$;

-- ============================================================
-- 3. DAILY_SNAPSHOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  snapshot_date          DATE PRIMARY KEY,
  -- Users
  total_users            INT NOT NULL DEFAULT 0,
  new_users              INT NOT NULL DEFAULT 0,
  total_customers        INT NOT NULL DEFAULT 0,
  total_agents           INT NOT NULL DEFAULT 0,
  active_agents          INT NOT NULL DEFAULT 0,
  -- Properties
  total_properties       INT NOT NULL DEFAULT 0,
  published_properties   INT NOT NULL DEFAULT 0,
  new_listings           INT NOT NULL DEFAULT 0,
  expired_listings       INT NOT NULL DEFAULT 0,
  -- Leads / CRM
  total_leads            INT NOT NULL DEFAULT 0,
  new_leads              INT NOT NULL DEFAULT 0,
  won_leads              INT NOT NULL DEFAULT 0,
  -- Revenue
  total_revenue          NUMERIC(15,2) NOT NULL DEFAULT 0,
  package_revenue        NUMERIC(15,2) NOT NULL DEFAULT 0,
  banner_revenue         NUMERIC(15,2) NOT NULL DEFAULT 0,
  transaction_count      INT NOT NULL DEFAULT 0,
  -- Engagement
  total_page_views       INT NOT NULL DEFAULT 0,
  property_views         INT NOT NULL DEFAULT 0,
  search_count           INT NOT NULL DEFAULT 0,
  -- Performance
  avg_property_score     NUMERIC(5,2),
  avg_lead_response_hrs  NUMERIC(8,2),
  conversion_rate        NUMERIC(5,2),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshots_admin_read" ON public.daily_snapshots;
CREATE POLICY "snapshots_admin_read" ON public.daily_snapshots
  FOR SELECT TO authenticated USING (public.is_staff());

-- ============================================================
-- 4. REVENUE_REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.revenue_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date      DATE NOT NULL,
  period_type      TEXT NOT NULL CHECK (period_type IN ('daily','weekly','monthly','yearly')),
  -- Revenue breakdown
  total_revenue    NUMERIC(15,2) NOT NULL DEFAULT 0,
  package_revenue  NUMERIC(15,2) NOT NULL DEFAULT 0,
  banner_revenue   NUMERIC(15,2) NOT NULL DEFAULT 0,
  sponsored_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  subscription_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  refunds          NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_revenue      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_collected    NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Counts
  transaction_count INT NOT NULL DEFAULT 0,
  new_subscriptions INT NOT NULL DEFAULT 0,
  renewals_count   INT NOT NULL DEFAULT 0,
  churned_count    INT NOT NULL DEFAULT 0,
  -- Metadata
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_date, period_type)
);

ALTER TABLE public.revenue_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_reports_admin" ON public.revenue_reports;
CREATE POLICY "revenue_reports_admin" ON public.revenue_reports
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_revenue_reports_date ON public.revenue_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_reports_type ON public.revenue_reports(period_type);

-- ============================================================
-- 5. fn_generate_daily_snapshot() — Cron function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_generate_daily_snapshot(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snap public.daily_snapshots%ROWTYPE;
BEGIN
  v_snap.snapshot_date := p_date;
  v_snap.total_users := (SELECT COUNT(*) FROM public.profiles);
  v_snap.new_users := (SELECT COUNT(*) FROM public.profiles WHERE created_at::DATE = p_date);
  v_snap.total_customers := (SELECT COUNT(*) FROM public.profiles WHERE role = 'customer');
  v_snap.total_agents := (SELECT COUNT(*) FROM public.profiles WHERE role = 'agent');
  v_snap.active_agents := (SELECT COUNT(*) FROM public.profiles WHERE role = 'agent' AND status = 'active');
  v_snap.total_properties := (SELECT COUNT(*) FROM public.properties);
  v_snap.published_properties := (SELECT COUNT(*) FROM public.properties WHERE status = 'published');
  v_snap.new_listings := (SELECT COUNT(*) FROM public.properties WHERE created_at::DATE = p_date);
  v_snap.expired_listings := (SELECT COUNT(*) FROM public.properties WHERE expires_at::DATE = p_date AND status = 'archived');
  v_snap.total_leads := (SELECT COUNT(*) FROM public.enquiries);
  v_snap.new_leads := (SELECT COUNT(*) FROM public.enquiries WHERE created_at::DATE = p_date);
  v_snap.won_leads := (SELECT COUNT(*) FROM public.enquiries WHERE lead_status = 'won' AND closed_at::DATE = p_date);
  v_snap.total_revenue := (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'paid');
  v_snap.package_revenue := (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'paid' AND package_id IS NOT NULL AND paid_at::DATE = p_date);
  v_snap.transaction_count := (SELECT COUNT(*) FROM public.payments WHERE status = 'paid' AND paid_at::DATE = p_date);
  v_snap.avg_property_score := (SELECT AVG(overall_score) FROM public.property_scores);

  INSERT INTO public.daily_snapshots VALUES (v_snap.*)
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    total_customers = EXCLUDED.total_customers,
    total_agents = EXCLUDED.total_agents,
    active_agents = EXCLUDED.active_agents,
    total_properties = EXCLUDED.total_properties,
    published_properties = EXCLUDED.published_properties,
    new_listings = EXCLUDED.new_listings,
    expired_listings = EXCLUDED.expired_listings,
    total_leads = EXCLUDED.total_leads,
    new_leads = EXCLUDED.new_leads,
    won_leads = EXCLUDED.won_leads,
    total_revenue = EXCLUDED.total_revenue,
    package_revenue = EXCLUDED.package_revenue,
    transaction_count = EXCLUDED.transaction_count,
    avg_property_score = EXCLUDED.avg_property_score;

  RETURN jsonb_build_object('snapshot_date', p_date, 'success', true,
    'total_users', v_snap.total_users, 'published_properties', v_snap.published_properties);
END;
$$;

-- ============================================================
-- 6. MATERIALIZED VIEW: mv_admin_dashboard_stats
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_dashboard_stats;
CREATE MATERIALIZED VIEW public.mv_admin_dashboard_stats AS
SELECT
  -- User counts
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'customer') AS total_customers,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'agent' AND status = 'active') AS active_agents,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - INTERVAL '30 days') AS new_users_30d,
  -- Property counts
  (SELECT COUNT(*) FROM public.properties WHERE status = 'published') AS published_properties,
  (SELECT COUNT(*) FROM public.properties WHERE status = 'pending_verification') AS pending_verification,
  (SELECT COUNT(*) FROM public.properties WHERE status = 'submitted') AS submitted_properties,
  (SELECT COUNT(*) FROM public.properties WHERE created_at >= now() - INTERVAL '30 days') AS new_listings_30d,
  -- Revenue
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'paid') AS total_revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'paid' AND paid_at >= now() - INTERVAL '30 days') AS revenue_30d,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'paid' AND paid_at >= now() - INTERVAL '7 days') AS revenue_7d,
  -- Leads
  (SELECT COUNT(*) FROM public.enquiries) AS total_leads,
  (SELECT COUNT(*) FROM public.enquiries WHERE lead_status = 'new') AS new_leads,
  (SELECT COUNT(*) FROM public.enquiries WHERE lead_status = 'won') AS won_leads,
  (SELECT COUNT(*) FROM public.enquiries WHERE created_at >= now() - INTERVAL '30 days') AS new_leads_30d,
  -- Banners
  (SELECT COUNT(*) FROM public.advertisements WHERE is_active = true AND approval_status = 'approved') AS active_banners,
  (SELECT COALESCE(SUM(clicks), 0) FROM public.advertisements) AS total_ad_clicks,
  -- Packages
  (SELECT COUNT(*) FROM public.agent_packages WHERE status = 'active') AS active_subscriptions,
  -- Scores
  (SELECT ROUND(AVG(overall_score), 1) FROM public.property_scores) AS avg_property_score,
  (SELECT ROUND(AVG(overall_score), 1) FROM public.agent_scores) AS avg_agent_score,
  now() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_admin_stats_unique ON public.mv_admin_dashboard_stats((refreshed_at));

-- ============================================================
-- 7. MATERIALIZED VIEW: mv_revenue_by_period
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_revenue_by_period;
CREATE MATERIALIZED VIEW public.mv_revenue_by_period AS
SELECT
  DATE_TRUNC('day', paid_at)::DATE AS period_date,
  'daily' AS period_type,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_revenue,
  SUM(CASE WHEN package_id IS NOT NULL THEN amount ELSE 0 END) AS package_revenue,
  AVG(amount) AS avg_transaction
FROM public.payments
WHERE status = 'paid' AND paid_at IS NOT NULL
GROUP BY DATE_TRUNC('day', paid_at)::DATE
UNION ALL
SELECT
  DATE_TRUNC('week', paid_at)::DATE AS period_date,
  'weekly' AS period_type,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_revenue,
  SUM(CASE WHEN package_id IS NOT NULL THEN amount ELSE 0 END) AS package_revenue,
  AVG(amount) AS avg_transaction
FROM public.payments
WHERE status = 'paid' AND paid_at IS NOT NULL
GROUP BY DATE_TRUNC('week', paid_at)::DATE
UNION ALL
SELECT
  DATE_TRUNC('month', paid_at)::DATE AS period_date,
  'monthly' AS period_type,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_revenue,
  SUM(CASE WHEN package_id IS NOT NULL THEN amount ELSE 0 END) AS package_revenue,
  AVG(amount) AS avg_transaction
FROM public.payments
WHERE status = 'paid' AND paid_at IS NOT NULL
GROUP BY DATE_TRUNC('month', paid_at)::DATE;

CREATE INDEX IF NOT EXISTS idx_mv_revenue_date   ON public.mv_revenue_by_period(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_mv_revenue_period ON public.mv_revenue_by_period(period_type);

-- ============================================================
-- 8. fn_refresh_all_materialized_views() — Cron function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_refresh_all_materialized_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_dashboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_revenue_by_period;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_property_listing;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error refreshing materialized views: %', SQLERRM;
END;
$$;

-- ============================================================
-- 9. fn_get_property_analytics() — Per-property analytics RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_property_analytics(
  p_property_id UUID,
  p_days        INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  -- Check ownership or staff access
  IF NOT (public.is_staff() OR EXISTS (
    SELECT 1 FROM public.properties WHERE id = p_property_id
      AND (owner_id = auth.uid() OR assigned_agent_id = auth.uid())
  )) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'property_id',    p_property_id,
    'views_total',    (SELECT view_count FROM public.properties WHERE id = p_property_id),
    'views_period',   (SELECT COUNT(*) FROM public.property_views WHERE property_id = p_property_id AND viewed_at >= now() - (p_days || ' days')::INTERVAL),
    'enquiries_total',(SELECT COUNT(*) FROM public.enquiries WHERE property_id = p_property_id),
    'enquiries_period',(SELECT COUNT(*) FROM public.enquiries WHERE property_id = p_property_id AND created_at >= now() - (p_days || ' days')::INTERVAL),
    'favorites_count',(SELECT COUNT(*) FROM public.favorites WHERE property_id = p_property_id),
    'score',          (SELECT jsonb_build_object('overall', overall_score, 'breakdown', score_breakdown) FROM public.property_scores WHERE property_id = p_property_id),
    'views_by_day', (
      SELECT jsonb_agg(jsonb_build_object('date', viewed_at::DATE, 'count', cnt))
      FROM (
        SELECT viewed_at::DATE, COUNT(*) AS cnt
        FROM public.property_views
        WHERE property_id = p_property_id AND viewed_at >= now() - (p_days || ' days')::INTERVAL
        GROUP BY viewed_at::DATE ORDER BY viewed_at::DATE
      ) d
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 10. fn_get_agent_analytics() — Per-agent analytics RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_agent_analytics(
  p_agent_id UUID DEFAULT auth.uid(),
  p_days     INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() != p_agent_id AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'agent_id',         p_agent_id,
    'score',            (SELECT jsonb_build_object('overall', overall_score, 'conversion', conversion_score, 'rating', rating_score) FROM public.agent_scores WHERE agent_id = p_agent_id),
    'properties',       (SELECT COUNT(*) FROM public.properties WHERE owner_id = p_agent_id AND status = 'published'),
    'leads_total',      (SELECT COUNT(*) FROM public.enquiries WHERE assigned_to = p_agent_id),
    'leads_period',     (SELECT COUNT(*) FROM public.enquiries WHERE assigned_to = p_agent_id AND created_at >= now() - (p_days || ' days')::INTERVAL),
    'won_leads',        (SELECT COUNT(*) FROM public.enquiries WHERE assigned_to = p_agent_id AND lead_status = 'won'),
    'overdue_leads',    (SELECT COUNT(*) FROM public.enquiries WHERE assigned_to = p_agent_id AND follow_up_at < now() AND lead_status NOT IN ('won','lost','closed')),
    'revenue_generated',(SELECT COALESCE(SUM(conversion_value), 0) FROM public.enquiries WHERE assigned_to = p_agent_id AND lead_status = 'won'),
    'avg_rating',       (SELECT ROUND(AVG(r.rating), 2) FROM public.reviews r JOIN public.properties p ON p.id = r.property_id WHERE p.owner_id = p_agent_id),
    'package',          (SELECT jsonb_build_object('name', pk.name, 'expires_at', ap.expires_at, 'status', ap.status)
                         FROM public.agent_packages ap JOIN public.packages pk ON pk.id = ap.package_id
                         WHERE ap.agent_id = p_agent_id AND ap.status = 'active' ORDER BY ap.created_at DESC LIMIT 1)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 11. GRANTS
-- ============================================================
GRANT INSERT ON public.analytics_events TO anon, authenticated, service_role;
GRANT SELECT ON public.analytics_events TO authenticated, service_role;
GRANT ALL ON public.daily_snapshots TO service_role;
GRANT SELECT ON public.daily_snapshots TO authenticated;
GRANT ALL ON public.revenue_reports TO service_role;
GRANT SELECT ON public.revenue_reports TO authenticated;
GRANT SELECT ON public.mv_admin_dashboard_stats TO authenticated, service_role;
GRANT SELECT ON public.mv_revenue_by_period TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_track_event(TEXT, UUID, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_generate_daily_snapshot(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_all_materialized_views() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_property_analytics(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_agent_analytics(UUID, INT) TO authenticated, service_role;
