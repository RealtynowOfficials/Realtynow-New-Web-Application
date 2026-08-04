-- Migration: 20260727030000_0053_ai_verified_listings.sql
-- Description: "AI Verified Listings" feature — deterministic + AI-assisted property
--   verification pipeline. Adds ai_verifications (append-only audit trail, one row per
--   verification run) and verification_logs (append-only action log), plus lightweight
--   denormalized columns on public.properties for fast badge rendering without a join.
--
-- Score/status thresholds (documented here since edge functions apply them, not SQL):
--   - Any hard deterministic failure (invalid_location or missing_fields) => 'Rejected'
--     outright, no AI call made (saves cost/latency on unsalvageable listings).
--   - All deterministic checks pass AND combined score >= 80          => 'AI Verified'
--   - Combined score >= 50 and < 80, or AI flags spam/fake_images/etc => 'Manual Review'
--   - Otherwise (score < 50)                                          => 'Rejected'
--   - No verification run yet                                        => 'Pending AI'

-- ============================================================
-- 1. properties: denormalized AI verification columns
-- ============================================================
-- NOTE: ai_score already exists (added in 20260727020000_0052_property_advanced_filters.sql
-- as a demo-seeded column); we reuse it as the authoritative AI Confidence Score field
-- rather than introduce a duplicate column. verification_status/ai_verified_at are new.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ai_score INT;
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'Pending AI'
    CHECK (verification_status IN ('Pending AI', 'AI Verified', 'Manual Review', 'Rejected'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ai_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_properties_verification_status ON public.properties(verification_status);

-- ============================================================
-- 2. ai_verifications — append-only audit trail (one row per verification run)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  ai_score            INT NOT NULL DEFAULT 0 CHECK (ai_score BETWEEN 0 AND 100),
  verification_status TEXT NOT NULL DEFAULT 'Pending AI'
    CHECK (verification_status IN ('Pending AI', 'AI Verified', 'Manual Review', 'Rejected')),
  -- Per-check diagnostic results, e.g.
  -- {
  --   "duplicate":        { "passed": true, "reason": "..." },
  --   "fake_images":      { "passed": true, "reason": "...", "score": 90 },
  --   "spam":             { "passed": true, "reason": "...", "score": 95 },
  --   "price_anomaly":    { "passed": true, "reason": "..." },
  --   "missing_fields":   { "passed": true, "reason": "..." },
  --   "invalid_location": { "passed": true, "reason": "..." },
  --   "contact_validation": { "passed": true, "reason": "..." },
  --   "title_quality":    { "passed": true, "reason": "...", "score": 88 }
  -- }
  check_results       JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by         TEXT NOT NULL DEFAULT 'AI', -- literal 'AI', or admin identifier string on override
  admin_override       BOOLEAN NOT NULL DEFAULT false,
  admin_remarks        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_verifications_property ON public.ai_verifications(property_id, created_at DESC);

ALTER TABLE public.ai_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_verifications_admin_all" ON public.ai_verifications;
CREATE POLICY "ai_verifications_admin_all" ON public.ai_verifications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ai_verifications_owner_select" ON public.ai_verifications;
CREATE POLICY "ai_verifications_owner_select" ON public.ai_verifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = ai_verifications.property_id AND p.owner_id = auth.uid()
    )
  );

-- Convenience view: latest verification per property (append-only table favors a
-- "latest" query over overwriting rows, which preserves the full audit trail).
CREATE OR REPLACE VIEW public.v_ai_verifications_latest WITH (security_invoker = true) AS
SELECT DISTINCT ON (property_id) *
FROM public.ai_verifications
ORDER BY property_id, created_at DESC;

GRANT SELECT ON public.v_ai_verifications_latest TO authenticated;

-- ============================================================
-- 3. verification_logs — append-only audit log (never updated/deleted)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  ai_verification_id  UUID REFERENCES public.ai_verifications(id) ON DELETE SET NULL,
  action              TEXT NOT NULL, -- 'ai_verify_run' | 'admin_approve' | 'admin_reject' | 'admin_override'
  actor               TEXT NOT NULL, -- 'AI' or admin user id/email
  details             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_property ON public.verification_logs(property_id, created_at DESC);

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_logs_admin_all" ON public.verification_logs;
CREATE POLICY "verification_logs_admin_all" ON public.verification_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No public/anon access; owners are not granted access to raw logs (only to the
-- ai_verifications summary rows above), matching the spec's access model.

-- ============================================================
-- 4. Trigger: keep properties.ai_score / verification_status / ai_verified_at in sync
--    whenever a new ai_verifications row lands (append-only insert pattern).
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_property_ai_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.properties
  SET
    ai_score = NEW.ai_score,
    verification_status = NEW.verification_status,
    ai_verified_at = NEW.verified_at,
    updated_at = now()
  WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_property_ai_verification ON public.ai_verifications;
CREATE TRIGGER trg_sync_property_ai_verification
  AFTER INSERT ON public.ai_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_ai_verification();
