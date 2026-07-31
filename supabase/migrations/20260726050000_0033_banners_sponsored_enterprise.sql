-- =============================================================================
-- Migration: 20260726050000_0033_banners_sponsored_enterprise.sql
-- Description: Enterprise banner & sponsored listings system — adds banner
--              formats, sponsored types, rotation engine, budget tracking,
--              area exclusivity control, and analytics tracking.
-- =============================================================================

-- ============================================================
-- 1. EXPAND advertisements TABLE (already exists from migration 0014)
-- ============================================================
ALTER TABLE public.advertisements
  -- Banner format
  ADD COLUMN IF NOT EXISTS banner_format       TEXT DEFAULT 'single'
                              CHECK (banner_format IN ('single','double','triple','leaderboard','rectangle','skyscraper','interstitial')),
  -- Sponsored listing type
  ADD COLUMN IF NOT EXISTS sponsored_type      TEXT
                              CHECK (sponsored_type IN ('eye_target','omni_target','featured','top_property','preferred','area_wise','premium') OR sponsored_type IS NULL),
  -- Rotation
  ADD COLUMN IF NOT EXISTS rotation_enabled    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rotation_interval_s INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS rotation_weight     INT DEFAULT 1,
  -- Budget & billing
  ADD COLUMN IF NOT EXISTS budget_type         TEXT DEFAULT 'fixed'
                              CHECK (budget_type IN ('cpm','cpc','fixed','daily_budget')),
  ADD COLUMN IF NOT EXISTS budget_amount       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_spent        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_click      NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS cost_per_impression NUMERIC(8,4),
  -- Booking
  ADD COLUMN IF NOT EXISTS booked_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id         UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_status    TEXT DEFAULT 'pending'
                              CHECK (approval_status IN ('draft','pending','approved','rejected','paused')),
  -- Area targeting
  ADD COLUMN IF NOT EXISTS locality_id        UUID REFERENCES public.localities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_exclusivity   BOOLEAN DEFAULT false,
  -- Analytics (extend existing clicks/impressions)
  ADD COLUMN IF NOT EXISTS unique_clicks      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_count   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_value   NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr                NUMERIC(8,4) DEFAULT 0,   -- click-through rate
  ADD COLUMN IF NOT EXISTS last_rotated_at    TIMESTAMPTZ;

-- Index new columns
CREATE INDEX IF NOT EXISTS idx_ads_sponsored_type  ON public.advertisements(sponsored_type);
CREATE INDEX IF NOT EXISTS idx_ads_booked_by       ON public.advertisements(booked_by);
CREATE INDEX IF NOT EXISTS idx_ads_locality        ON public.advertisements(locality_id);
CREATE INDEX IF NOT EXISTS idx_ads_approval        ON public.advertisements(approval_status);
CREATE INDEX IF NOT EXISTS idx_ads_rotation        ON public.advertisements(rotation_enabled, is_active);
CREATE INDEX IF NOT EXISTS idx_ads_starts_at       ON public.advertisements(starts_at);
CREATE INDEX IF NOT EXISTS idx_ads_ends_at         ON public.advertisements(ends_at);

-- ============================================================
-- 2. BANNER_ROTATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banner_rotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id  UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  placement         TEXT NOT NULL,
  slot_position     INT NOT NULL DEFAULT 1,
  weight            INT NOT NULL DEFAULT 1,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banner_rotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banner_rotations_read" ON public.banner_rotations;
CREATE POLICY "banner_rotations_read" ON public.banner_rotations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "banner_rotations_admin_write" ON public.banner_rotations;
CREATE POLICY "banner_rotations_admin_write" ON public.banner_rotations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_banner_rot_ad        ON public.banner_rotations(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_banner_rot_placement ON public.banner_rotations(placement, is_active);

-- ============================================================
-- 3. BANNER_ANALYTICS TABLE (Detailed click/impression events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banner_analytics (
  id               UUID DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN ('impression','click','conversion')),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id       TEXT,
  ip_address       INET,
  user_agent       TEXT,
  device_type      TEXT CHECK (device_type IN ('desktop','mobile','tablet') OR device_type IS NULL),
  page_url         TEXT,
  referrer         TEXT,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partition
CREATE TABLE IF NOT EXISTS public.banner_analytics_2026
  PARTITION OF public.banner_analytics
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

ALTER TABLE public.banner_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banner_analytics_insert" ON public.banner_analytics;
CREATE POLICY "banner_analytics_insert" ON public.banner_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "banner_analytics_admin_read" ON public.banner_analytics;
CREATE POLICY "banner_analytics_admin_read" ON public.banner_analytics
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_banner_analytics_ad        ON public.banner_analytics(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_type      ON public.banner_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_created   ON public.banner_analytics(created_at DESC);

-- ============================================================
-- 4. AREA_EXCLUSIVITY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.area_exclusivity (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id          UUID NOT NULL REFERENCES public.localities(id) ON DELETE CASCADE,
  max_premium_agents   INT NOT NULL DEFAULT 2,
  current_count        INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (locality_id)
);

ALTER TABLE public.area_exclusivity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "area_exclusivity_read" ON public.area_exclusivity;
CREATE POLICY "area_exclusivity_read" ON public.area_exclusivity
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "area_exclusivity_admin_write" ON public.area_exclusivity;
CREATE POLICY "area_exclusivity_admin_write" ON public.area_exclusivity
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 5. SPONSORED_LISTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sponsored_listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sponsored_type   TEXT NOT NULL
                     CHECK (sponsored_type IN ('eye_target','omni_target','featured','top_property','preferred','area_wise','premium')),
  locality_id      UUID REFERENCES public.localities(id) ON DELETE SET NULL,
  city_id          UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  budget_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_id       UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','expired','cancelled')),
  starts_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at          TIMESTAMPTZ,
  impressions      INT NOT NULL DEFAULT 0,
  clicks           INT NOT NULL DEFAULT 0,
  priority_score   INT NOT NULL DEFAULT 1,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsored_own" ON public.sponsored_listings;
CREATE POLICY "sponsored_own" ON public.sponsored_listings
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "sponsored_insert" ON public.sponsored_listings;
CREATE POLICY "sponsored_insert" ON public.sponsored_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id OR public.is_admin());

DROP POLICY IF EXISTS "sponsored_update" ON public.sponsored_listings;
CREATE POLICY "sponsored_update" ON public.sponsored_listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id OR public.is_admin())
  WITH CHECK (auth.uid() = agent_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_sponsored_property  ON public.sponsored_listings(property_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_agent     ON public.sponsored_listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_type      ON public.sponsored_listings(sponsored_type);
CREATE INDEX IF NOT EXISTS idx_sponsored_locality  ON public.sponsored_listings(locality_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_status    ON public.sponsored_listings(status);
CREATE INDEX IF NOT EXISTS idx_sponsored_ends_at   ON public.sponsored_listings(ends_at);

-- ============================================================
-- 6. fn_track_banner_event() — Track impressions & clicks
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_track_banner_event(
  p_ad_id      UUID,
  p_event_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_page_url   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update aggregate counters
  IF p_event_type = 'impression' THEN
    UPDATE public.advertisements SET impressions = COALESCE(impressions, 0) + 1, updated_at = now() WHERE id = p_ad_id;
  ELSIF p_event_type = 'click' THEN
    UPDATE public.advertisements SET clicks = COALESCE(clicks, 0) + 1, updated_at = now() WHERE id = p_ad_id;
  ELSIF p_event_type = 'conversion' THEN
    UPDATE public.advertisements SET conversion_count = COALESCE(conversion_count, 0) + 1, updated_at = now() WHERE id = p_ad_id;
  END IF;

  -- Recalculate CTR
  UPDATE public.advertisements
  SET ctr = CASE WHEN COALESCE(impressions, 0) > 0 THEN ROUND((COALESCE(clicks, 0)::NUMERIC / impressions) * 100, 4) ELSE 0 END
  WHERE id = p_ad_id;

  -- Insert detailed event record
  INSERT INTO public.banner_analytics (advertisement_id, event_type, user_id, session_id, page_url)
  VALUES (p_ad_id, p_event_type, auth.uid(), p_session_id, p_page_url);
END;
$$;

-- ============================================================
-- 7. fn_get_active_banners() — Fetch banners for a placement
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_active_banners(
  p_placement   TEXT DEFAULT 'Homepage',
  p_limit       INT DEFAULT 5,
  p_city        TEXT DEFAULT NULL
)
RETURNS SETOF public.advertisements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.advertisements
  WHERE is_active = true
    AND approval_status = 'approved'
    AND placement = p_placement
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
    AND (impression_limit = 0 OR impressions < impression_limit)
    AND (p_city IS NULL OR city_targeting = 'All Cities' OR city_targeting = p_city)
  ORDER BY priority DESC, rotation_weight DESC, created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- 8. fn_check_area_exclusivity() — Check before adding premium agent
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_check_area_exclusivity(
  p_agent_id   UUID,
  p_locality_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max     INT;
  v_current INT;
BEGIN
  -- Get or create area exclusivity record
  INSERT INTO public.area_exclusivity (locality_id, max_premium_agents, current_count)
  VALUES (p_locality_id, 2, 0)
  ON CONFLICT (locality_id) DO NOTHING;

  SELECT max_premium_agents, current_count
  INTO v_max, v_current
  FROM public.area_exclusivity WHERE locality_id = p_locality_id;

  IF v_current >= v_max THEN
    RETURN jsonb_build_object(
      'available', false,
      'current_count', v_current,
      'max', v_max,
      'message', 'Area exclusivity slots are full for this locality'
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'current_count', v_current,
    'max', v_max,
    'slots_remaining', v_max - v_current
  );
END;
$$;

-- ============================================================
-- 9. fn_rotate_banners() — Weighted rotation for active banners
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_rotate_banners()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Update last_rotated_at for rotation tracking
  UPDATE public.advertisements
  SET last_rotated_at = now()
  WHERE is_active = true
    AND rotation_enabled = true
    AND approval_status = 'approved'
    AND (ends_at IS NULL OR ends_at > now());

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Pause ads that exceeded budget
  UPDATE public.advertisements
  SET is_active = false
  WHERE budget_type = 'fixed'
    AND budget_amount > 0
    AND budget_spent >= budget_amount
    AND is_active = true;

  -- Expire ads past end date
  UPDATE public.advertisements
  SET is_active = false
  WHERE ends_at IS NOT NULL
    AND ends_at < now()
    AND is_active = true;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 10. GRANTS & REALTIME
-- ============================================================
GRANT ALL ON public.banner_rotations TO authenticated, service_role;
GRANT ALL ON public.area_exclusivity TO authenticated, service_role;
GRANT ALL ON public.sponsored_listings TO authenticated, service_role;
GRANT INSERT ON public.banner_analytics TO anon, authenticated, service_role;
GRANT SELECT ON public.banner_analytics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_track_banner_event(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_active_banners(TEXT, INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_check_area_exclusivity(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_rotate_banners() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsored_listings; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banner_rotations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
