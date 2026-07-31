-- =============================================================================
-- Migration: 20260726020000_0030_property_schema_enterprise.sql
-- Description: Enterprise property specification expansion, scoring engine,
--              listing validity/expiry, property workflow enhancements,
--              and materialized view for high-performance public search.
-- =============================================================================

-- ============================================================
-- 1. EXPAND properties PURPOSE CHECK
-- ============================================================
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_purpose_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_purpose_check
  CHECK (purpose IN ('Sale','Resale','Rent','Lease','PG','CoLiving','Hostel','Short Stay','Vacation Rental','Commercial'));

-- ============================================================
-- 2. ADD MISSING PROPERTY SPECIFICATION COLUMNS
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS super_area          NUMERIC,
  ADD COLUMN IF NOT EXISTS building_area       NUMERIC,
  ADD COLUMN IF NOT EXISTS wall_area           NUMERIC,
  ADD COLUMN IF NOT EXISTS usable_area         NUMERIC,
  ADD COLUMN IF NOT EXISTS indoor_parking      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outdoor_parking     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS road_width          NUMERIC,
  ADD COLUMN IF NOT EXISTS corner_plot         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS water_supply        TEXT,
  ADD COLUMN IF NOT EXISTS power_backup        TEXT,
  ADD COLUMN IF NOT EXISTS lift                BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS security_type       TEXT,
  ADD COLUMN IF NOT EXISTS nearby_locations    JSONB DEFAULT '[]'::jsonb,
  -- Listing validity & expiry
  ADD COLUMN IF NOT EXISTS listing_validity    INT NOT NULL DEFAULT 90
                             CHECK (listing_validity IN (30,60,90,180,365)),
  ADD COLUMN IF NOT EXISTS expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_count       INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewed_at     TIMESTAMPTZ,
  -- Verification fields
  ADD COLUMN IF NOT EXISTS verified_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes  TEXT,
  -- SEO fields
  ADD COLUMN IF NOT EXISTS seo_title           TEXT,
  ADD COLUMN IF NOT EXISTS seo_description     TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords        TEXT[],
  -- Extra metadata
  ADD COLUMN IF NOT EXISTS property_code       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS source              TEXT DEFAULT 'portal'
                             CHECK (source IN ('portal','import','api','agent','builder')),
  ADD COLUMN IF NOT EXISTS language            TEXT DEFAULT 'en';

-- Auto-set expires_at when published_at is set
CREATE OR REPLACE FUNCTION public.fn_set_property_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.published_at IS NOT NULL AND OLD.published_at IS NULL THEN
    NEW.expires_at := NEW.published_at + (NEW.listing_validity || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_published_set_expiry ON public.properties;
CREATE TRIGGER on_property_published_set_expiry
  BEFORE UPDATE OF published_at ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_property_expiry();

-- Auto-generate property_code
CREATE OR REPLACE FUNCTION public.fn_generate_property_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.property_code IS NULL THEN
    NEW.property_code := 'RN-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_insert_code ON public.properties;
CREATE TRIGGER on_property_insert_code
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_property_code();

-- ============================================================
-- 3. PROPERTY SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.property_scores (
  property_id          UUID PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  seo_score            NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (seo_score BETWEEN 0 AND 100),
  image_score          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (image_score BETWEEN 0 AND 100),
  pricing_score        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (pricing_score BETWEEN 0 AND 100),
  description_score    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (description_score BETWEEN 0 AND 100),
  completeness_score   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  location_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (location_score BETWEEN 0 AND 100),
  market_score         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (market_score BETWEEN 0 AND 100),
  ai_score             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (ai_score BETWEEN 0 AND 100),
  overall_score        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  score_breakdown      JSONB DEFAULT '{}'::jsonb,
  recommendations      TEXT[],
  last_calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_scores_read" ON public.property_scores;
CREATE POLICY "property_scores_read" ON public.property_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "property_scores_write" ON public.property_scores;
CREATE POLICY "property_scores_write" ON public.property_scores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. AGENT SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_scores (
  agent_id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_score          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (listing_score BETWEEN 0 AND 100),
  response_time_score    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (response_time_score BETWEEN 0 AND 100),
  verification_score     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (verification_score BETWEEN 0 AND 100),
  conversion_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (conversion_score BETWEEN 0 AND 100),
  rating_score           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (rating_score BETWEEN 0 AND 100),
  renewal_score          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (renewal_score BETWEEN 0 AND 100),
  experience_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (experience_score BETWEEN 0 AND 100),
  package_score          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (package_score BETWEEN 0 AND 100),
  overall_score          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  total_listings         INT NOT NULL DEFAULT 0,
  published_listings     INT NOT NULL DEFAULT 0,
  total_leads            INT NOT NULL DEFAULT 0,
  converted_leads        INT NOT NULL DEFAULT 0,
  avg_response_hours     NUMERIC(8,2),
  avg_rating             NUMERIC(3,2),
  total_reviews          INT NOT NULL DEFAULT 0,
  last_calculated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_scores_read" ON public.agent_scores;
CREATE POLICY "agent_scores_read" ON public.agent_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "agent_scores_write" ON public.agent_scores;
CREATE POLICY "agent_scores_write" ON public.agent_scores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. fn_calculate_property_score() RPC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_property_score(p_property_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop          public.properties%ROWTYPE;
  v_image_count   INT;
  v_doc_count     INT;
  v_video_count   INT;
  v_seo           NUMERIC := 0;
  v_image         NUMERIC := 0;
  v_pricing       NUMERIC := 0;
  v_description   NUMERIC := 0;
  v_completeness  NUMERIC := 0;
  v_location      NUMERIC := 0;
  v_market        NUMERIC := 0;
  v_ai            NUMERIC := 0;
  v_overall       NUMERIC := 0;
  v_recs          TEXT[] := ARRAY[]::TEXT[];
  v_breakdown     JSONB;
BEGIN
  SELECT * INTO v_prop FROM public.properties WHERE id = p_property_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Property not found'); END IF;

  SELECT COUNT(*) INTO v_image_count FROM public.property_images WHERE property_id = p_property_id;
  SELECT COUNT(*) INTO v_doc_count   FROM public.property_documents WHERE property_id = p_property_id;
  SELECT COUNT(*) INTO v_video_count FROM public.property_videos WHERE property_id = p_property_id;

  -- IMAGE SCORE (max 100) — 5 images = 50pts, 10 = 80pts, 15+ = 100pts
  v_image := LEAST(100, v_image_count * 7);
  IF v_video_count > 0 THEN v_image := LEAST(100, v_image + 15); END IF;
  IF v_image_count < 3 THEN v_recs := array_append(v_recs, 'Add at least 5 quality photos to improve score'); END IF;

  -- DESCRIPTION SCORE (max 100)
  IF v_prop.description IS NOT NULL THEN
    v_description := LEAST(100, GREATEST(0, LENGTH(v_prop.description) / 3));
  END IF;
  IF v_prop.ai_description IS NOT NULL THEN v_description := LEAST(100, v_description + 20); END IF;
  IF COALESCE(LENGTH(v_prop.description), 0) < 100 THEN
    v_recs := array_append(v_recs, 'Write a detailed description (min 200 characters)');
  END IF;

  -- SEO SCORE (max 100)
  IF v_prop.seo_title IS NOT NULL AND LENGTH(v_prop.seo_title) > 10 THEN v_seo := v_seo + 30; END IF;
  IF v_prop.seo_description IS NOT NULL AND LENGTH(v_prop.seo_description) > 50 THEN v_seo := v_seo + 30; END IF;
  IF v_prop.seo_keywords IS NOT NULL AND array_length(v_prop.seo_keywords, 1) > 0 THEN v_seo := v_seo + 20; END IF;
  IF v_prop.ai_tags IS NOT NULL AND array_length(v_prop.ai_tags, 1) > 0 THEN v_seo := v_seo + 20; END IF;
  IF v_seo < 30 THEN v_recs := array_append(v_recs, 'Add SEO title, description and keywords'); END IF;

  -- COMPLETENESS SCORE (max 100) — count of filled fields
  DECLARE v_fields_filled INT := 0; v_total_fields INT := 20;
  BEGIN
    IF v_prop.bedrooms IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.bathrooms IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.built_up_area IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.carpet_area IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.furnishing IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.facing IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.floor_number IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.total_floors IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.age_of_property IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.ownership_type IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.water_supply IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.power_backup IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.amenities IS NOT NULL AND array_length(v_prop.amenities, 1) > 0 THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_doc_count > 0 THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.latitude IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.address IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.locality_id IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.city_id IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF v_prop.balconies IS NOT NULL THEN v_fields_filled := v_fields_filled + 1; END IF;
    IF (v_prop.parking > 0 OR v_prop.indoor_parking > 0 OR v_prop.outdoor_parking > 0) THEN v_fields_filled := v_fields_filled + 1; END IF;
    v_completeness := ROUND((v_fields_filled::NUMERIC / v_total_fields) * 100, 2);
  END;
  IF v_completeness < 60 THEN v_recs := array_append(v_recs, 'Complete all property details for better visibility'); END IF;

  -- LOCATION SCORE (max 100)
  IF v_prop.latitude IS NOT NULL AND v_prop.longitude IS NOT NULL THEN v_location := v_location + 50; END IF;
  IF v_prop.locality_id IS NOT NULL THEN v_location := v_location + 30; END IF;
  IF v_prop.address IS NOT NULL THEN v_location := v_location + 20; END IF;
  IF v_location < 50 THEN v_recs := array_append(v_recs, 'Pin your property location on the map'); END IF;

  -- PRICING SCORE (max 100) — has price set & not zero
  IF v_prop.price > 0 THEN v_pricing := 70; END IF;
  IF v_prop.rent_amount IS NOT NULL AND v_prop.rent_amount > 0 THEN v_pricing := LEAST(100, v_pricing + 15); END IF;
  IF v_prop.security_deposit IS NOT NULL THEN v_pricing := LEAST(100, v_pricing + 15); END IF;

  -- MARKET SCORE — static 50 base (will be updated by AI edge function)
  v_market := 50;

  -- AI SCORE — based on AI content generated
  IF v_prop.ai_description IS NOT NULL THEN v_ai := v_ai + 40; END IF;
  IF v_prop.ai_seo IS NOT NULL THEN v_ai := v_ai + 30; END IF;
  IF v_prop.ai_tags IS NOT NULL AND array_length(v_prop.ai_tags, 1) > 0 THEN v_ai := v_ai + 30; END IF;

  -- OVERALL SCORE (weighted average)
  v_overall := ROUND(
    (v_seo * 0.10) +
    (v_image * 0.20) +
    (v_pricing * 0.10) +
    (v_description * 0.15) +
    (v_completeness * 0.20) +
    (v_location * 0.10) +
    (v_market * 0.05) +
    (v_ai * 0.10),
  2);

  v_breakdown := jsonb_build_object(
    'seo', v_seo, 'image', v_image, 'pricing', v_pricing,
    'description', v_description, 'completeness', v_completeness,
    'location', v_location, 'market', v_market, 'ai', v_ai
  );

  INSERT INTO public.property_scores (
    property_id, seo_score, image_score, pricing_score, description_score,
    completeness_score, location_score, market_score, ai_score, overall_score,
    score_breakdown, recommendations, last_calculated_at
  ) VALUES (
    p_property_id, v_seo, v_image, v_pricing, v_description,
    v_completeness, v_location, v_market, v_ai, v_overall,
    v_breakdown, v_recs, now()
  )
  ON CONFLICT (property_id) DO UPDATE SET
    seo_score = EXCLUDED.seo_score, image_score = EXCLUDED.image_score,
    pricing_score = EXCLUDED.pricing_score, description_score = EXCLUDED.description_score,
    completeness_score = EXCLUDED.completeness_score, location_score = EXCLUDED.location_score,
    market_score = EXCLUDED.market_score, ai_score = EXCLUDED.ai_score,
    overall_score = EXCLUDED.overall_score, score_breakdown = EXCLUDED.score_breakdown,
    recommendations = EXCLUDED.recommendations, last_calculated_at = now();

  RETURN jsonb_build_object(
    'property_id', p_property_id, 'overall_score', v_overall,
    'breakdown', v_breakdown, 'recommendations', v_recs
  );
END;
$$;

-- ============================================================
-- 6. fn_calculate_agent_score() RPC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_agent_score(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_listings    INT;
  v_published         INT;
  v_total_leads       INT;
  v_won_leads         INT;
  v_avg_rating        NUMERIC;
  v_total_reviews     INT;
  v_listing_score     NUMERIC := 0;
  v_response_score    NUMERIC := 50; -- default until measured
  v_verification_score NUMERIC := 0;
  v_conversion_score  NUMERIC := 0;
  v_rating_score      NUMERIC := 0;
  v_renewal_score     NUMERIC := 50;
  v_experience_score  NUMERIC := 0;
  v_package_score     NUMERIC := 0;
  v_overall           NUMERIC := 0;
BEGIN
  SELECT COUNT(*) INTO v_total_listings FROM public.properties WHERE assigned_agent_id = p_agent_id OR owner_id = p_agent_id;
  SELECT COUNT(*) INTO v_published FROM public.properties WHERE (assigned_agent_id = p_agent_id OR owner_id = p_agent_id) AND status = 'published';
  SELECT COUNT(*) INTO v_total_leads FROM public.enquiries WHERE assigned_to = p_agent_id;
  SELECT COUNT(*) INTO v_won_leads FROM public.enquiries WHERE assigned_to = p_agent_id AND lead_status IN ('won','closed');
  SELECT AVG(rating), COUNT(*) INTO v_avg_rating, v_total_reviews FROM public.reviews
    JOIN public.properties ON reviews.property_id = properties.id
    WHERE properties.assigned_agent_id = p_agent_id OR properties.owner_id = p_agent_id;

  -- LISTING SCORE: up to 100 — scales with published listings
  v_listing_score := LEAST(100, v_published * 5);

  -- VERIFICATION SCORE: % of agent's properties that passed verification
  IF v_total_listings > 0 THEN
    v_verification_score := ROUND((v_published::NUMERIC / v_total_listings) * 100, 2);
  END IF;

  -- CONVERSION SCORE: % of leads that became won
  IF v_total_leads > 0 THEN
    v_conversion_score := ROUND((v_won_leads::NUMERIC / v_total_leads) * 100, 2);
  END IF;

  -- RATING SCORE
  IF v_avg_rating IS NOT NULL THEN
    v_rating_score := ROUND((v_avg_rating / 5.0) * 100, 2);
  END IF;

  -- EXPERIENCE SCORE based on profile
  DECLARE v_exp INT;
  BEGIN
    SELECT COALESCE(EXTRACT(YEAR FROM age(now(), created_at))::INT, 0) INTO v_exp
    FROM public.profiles WHERE id = p_agent_id;
    v_experience_score := LEAST(100, v_exp * 15);
  END;

  -- PACKAGE SCORE — does agent have an active package?
  IF EXISTS (SELECT 1 FROM public.agent_packages WHERE agent_id = p_agent_id AND status = 'active' AND expires_at > now()) THEN
    v_package_score := 80;
  END IF;

  -- OVERALL (weighted)
  v_overall := ROUND(
    (v_listing_score * 0.15) +
    (v_response_score * 0.15) +
    (v_verification_score * 0.15) +
    (v_conversion_score * 0.20) +
    (v_rating_score * 0.15) +
    (v_renewal_score * 0.05) +
    (v_experience_score * 0.05) +
    (v_package_score * 0.10),
  2);

  INSERT INTO public.agent_scores (
    agent_id, listing_score, response_time_score, verification_score, conversion_score,
    rating_score, renewal_score, experience_score, package_score, overall_score,
    total_listings, published_listings, total_leads, converted_leads,
    avg_rating, total_reviews, last_calculated_at
  ) VALUES (
    p_agent_id, v_listing_score, v_response_score, v_verification_score, v_conversion_score,
    v_rating_score, v_renewal_score, v_experience_score, v_package_score, v_overall,
    v_total_listings, v_published, v_total_leads, v_won_leads,
    v_avg_rating, v_total_reviews, now()
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    listing_score = EXCLUDED.listing_score,
    response_time_score = EXCLUDED.response_time_score,
    verification_score = EXCLUDED.verification_score,
    conversion_score = EXCLUDED.conversion_score,
    rating_score = EXCLUDED.rating_score,
    renewal_score = EXCLUDED.renewal_score,
    experience_score = EXCLUDED.experience_score,
    package_score = EXCLUDED.package_score,
    overall_score = EXCLUDED.overall_score,
    total_listings = EXCLUDED.total_listings,
    published_listings = EXCLUDED.published_listings,
    total_leads = EXCLUDED.total_leads,
    converted_leads = EXCLUDED.converted_leads,
    avg_rating = EXCLUDED.avg_rating,
    total_reviews = EXCLUDED.total_reviews,
    last_calculated_at = now();

  RETURN jsonb_build_object('agent_id', p_agent_id, 'overall_score', v_overall);
END;
$$;

-- ============================================================
-- 7. TRIGGER: AUTO-CALCULATE SCORE AFTER PROPERTY UPDATES
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_trigger_property_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.fn_calculate_property_score(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_score_recalc ON public.properties;
CREATE TRIGGER on_property_score_recalc
  AFTER INSERT OR UPDATE OF
    title, description, seo_title, seo_description, seo_keywords,
    furnishing, bedrooms, bathrooms, built_up_area, carpet_area,
    latitude, longitude, locality_id, city_id, price, amenities,
    ai_description, ai_seo, ai_tags, status
  ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_property_score();

-- Trigger on image insert/delete to recalc score
CREATE OR REPLACE FUNCTION public.fn_trigger_property_score_on_media()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.fn_calculate_property_score(COALESCE(NEW.property_id, OLD.property_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_property_image_score ON public.property_images;
CREATE TRIGGER on_property_image_score
  AFTER INSERT OR DELETE ON public.property_images
  FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_property_score_on_media();

-- ============================================================
-- 8. MATERIALIZED VIEW: mv_property_listing (FAST PUBLIC SEARCH)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_property_listing;

CREATE MATERIALIZED VIEW public.mv_property_listing AS
SELECT
  p.id,
  p.property_code,
  p.owner_id,
  p.title,
  p.description,
  p.purpose,
  p.status,
  p.is_live,
  p.is_featured,
  p.is_luxury,
  p.price,
  p.rent_amount,
  p.security_deposit,
  p.bedrooms,
  p.bathrooms,
  p.balconies,
  p.floor_number,
  p.total_floors,
  p.built_up_area,
  p.carpet_area,
  p.super_area,
  p.plot_area,
  p.facing,
  p.furnishing,
  p.parking,
  p.indoor_parking,
  p.outdoor_parking,
  p.age_of_property,
  p.ownership_type,
  p.water_supply,
  p.power_backup,
  p.lift,
  p.corner_plot,
  p.road_width,
  p.amenities,
  p.latitude,
  p.longitude,
  p.address,
  p.listing_validity,
  p.expires_at,
  p.published_at,
  p.created_at,
  p.updated_at,
  p.ai_tags,
  p.seo_title,
  p.seo_description,
  p.seo_keywords,
  -- Joined fields
  c.name AS city_name,
  c.state AS city_state,
  l.name AS locality_name,
  l.pincode AS locality_pincode,
  pt.name AS property_type_name,
  pt.category AS property_type_category,
  -- Owner info
  pr.first_name AS owner_first_name,
  pr.last_name AS owner_last_name,
  pr.phone AS owner_phone,
  pr.avatar_url AS owner_avatar,
  pr.role AS owner_role,
  -- Media counts
  (SELECT COUNT(*) FROM public.property_images pi WHERE pi.property_id = p.id) AS image_count,
  (SELECT url FROM public.property_images pi WHERE pi.property_id = p.id ORDER BY pi.position LIMIT 1) AS cover_image,
  (SELECT COUNT(*) FROM public.property_videos pv WHERE pv.property_id = p.id) AS video_count,
  -- Score
  ps.overall_score,
  ps.completeness_score,
  ps.seo_score,
  -- View count
  p.view_count,
  -- Enquiry count
  (SELECT COUNT(*) FROM public.enquiries e WHERE e.property_id = p.id) AS enquiry_count
FROM public.properties p
LEFT JOIN public.cities c ON c.id = p.city_id
LEFT JOIN public.localities l ON l.id = p.locality_id
LEFT JOIN public.property_types pt ON pt.id = p.property_type_id
LEFT JOIN public.profiles pr ON pr.id = p.owner_id
LEFT JOIN public.property_scores ps ON ps.property_id = p.id
WHERE p.status = 'published';

-- Index on the materialized view for fast filtering
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_property_listing_id ON public.mv_property_listing(id);
CREATE INDEX IF NOT EXISTS idx_mv_property_city ON public.mv_property_listing(city_name);
CREATE INDEX IF NOT EXISTS idx_mv_property_price ON public.mv_property_listing(price);
CREATE INDEX IF NOT EXISTS idx_mv_property_purpose ON public.mv_property_listing(purpose);
CREATE INDEX IF NOT EXISTS idx_mv_property_featured ON public.mv_property_listing(is_featured);
CREATE INDEX IF NOT EXISTS idx_mv_property_score ON public.mv_property_listing(overall_score DESC);

-- ============================================================
-- 9. fn_refresh_property_listing_view() — called by cron
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_refresh_property_listing_view()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_property_listing;
END;
$$;

-- ============================================================
-- 10. fn_expire_stale_listings() — called by daily cron
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_expire_stale_listings()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  UPDATE public.properties
  SET status = 'archived', updated_at = now()
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 11. ADDITIONAL PROPERTY INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_properties_expires_at    ON public.properties(expires_at);
CREATE INDEX IF NOT EXISTS idx_properties_purpose       ON public.properties(purpose);
CREATE INDEX IF NOT EXISTS idx_properties_listing_val   ON public.properties(listing_validity);
CREATE INDEX IF NOT EXISTS idx_properties_verified      ON public.properties(verified_at);
CREATE INDEX IF NOT EXISTS idx_properties_code          ON public.properties(property_code);
CREATE INDEX IF NOT EXISTS idx_prop_scores_overall      ON public.property_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_scores_overall     ON public.agent_scores(overall_score DESC);

-- ============================================================
-- 12. GRANTS & REALTIME
-- ============================================================
GRANT ALL ON public.property_scores TO authenticated, service_role;
GRANT ALL ON public.agent_scores TO authenticated, service_role;
GRANT SELECT ON public.mv_property_listing TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_calculate_property_score(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_calculate_agent_score(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_property_listing_view() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_expire_stale_listings() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.property_scores; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_scores; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
