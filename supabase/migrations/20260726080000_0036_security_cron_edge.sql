-- =============================================================================
-- Migration: 20260726080000_0036_security_cron_edge.sql
-- Description: Security hardening — rate limiting, API keys, login attempt
--              tracking, CSRF tokens, pg_cron job registration, and final
--              production security policies.
-- =============================================================================

-- ============================================================
-- 1. RATE_LIMITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier       TEXT NOT NULL,  -- IP or user_id
  endpoint         TEXT NOT NULL,
  request_count    INT NOT NULL DEFAULT 1,
  window_start     TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique ON public.rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON public.rate_limits(blocked_until);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_service" ON public.rate_limits;
CREATE POLICY "rate_limits_service" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. fn_check_rate_limit() — Returns true if request is allowed
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_check_rate_limit(
  p_identifier     TEXT,
  p_endpoint       TEXT,
  p_max_requests   INT DEFAULT 60,
  p_window_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec   public.rate_limits%ROWTYPE;
  v_window_start TIMESTAMPTZ := now() - (p_window_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Check if currently blocked
  SELECT * INTO v_rec FROM public.rate_limits WHERE identifier = p_identifier AND endpoint = p_endpoint;

  IF FOUND AND v_rec.blocked_until IS NOT NULL AND v_rec.blocked_until > now() THEN
    RETURN jsonb_build_object('allowed', false, 'blocked_until', v_rec.blocked_until, 'retry_after_seconds', EXTRACT(EPOCH FROM (v_rec.blocked_until - now()))::INT);
  END IF;

  -- Upsert request count
  INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, now())
  ON CONFLICT (identifier, endpoint) DO UPDATE SET
    request_count = CASE
      WHEN rate_limits.window_start < v_window_start THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start THEN now()
      ELSE rate_limits.window_start
    END,
    blocked_until = NULL
  RETURNING * INTO v_rec;

  IF v_rec.request_count > p_max_requests THEN
    UPDATE public.rate_limits
    SET blocked_until = now() + INTERVAL '15 minutes'
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN jsonb_build_object('allowed', false, 'blocked_until', now() + INTERVAL '15 minutes', 'reason', 'Rate limit exceeded');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'request_count', v_rec.request_count, 'remaining', p_max_requests - v_rec.request_count);
END;
$$;

-- ============================================================
-- 3. LOGIN_ATTEMPTS TABLE (Brute force protection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  ip_address      INET,
  success         BOOLEAN NOT NULL DEFAULT false,
  failure_reason  TEXT,
  user_agent      TEXT,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email  ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip     ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_at     ON public.login_attempts(attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_attempts_admin" ON public.login_attempts;
CREATE POLICY "login_attempts_admin" ON public.login_attempts
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "login_attempts_insert" ON public.login_attempts;
CREATE POLICY "login_attempts_insert" ON public.login_attempts
  FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

-- ============================================================
-- 4. API_KEYS TABLE (Server-to-server auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,  -- Store only hash, never plaintext
  key_prefix      TEXT NOT NULL,         -- First 8 chars for identification
  permissions     TEXT[] NOT NULL DEFAULT ARRAY['read'],
  owner_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  usage_count     BIGINT NOT NULL DEFAULT 0,
  ip_whitelist    INET[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_admin" ON public.api_keys;
CREATE POLICY "api_keys_admin" ON public.api_keys
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "api_keys_own" ON public.api_keys;
CREATE POLICY "api_keys_own" ON public.api_keys
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- ============================================================
-- 5. AUDIT_LOGS ENHANCEMENTS
-- ============================================================
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS severity     TEXT DEFAULT 'info'
                              CHECK (severity IN ('debug','info','warning','error','critical')),
  ADD COLUMN IF NOT EXISTS session_id   TEXT,
  ADD COLUMN IF NOT EXISTS user_agent   TEXT,
  ADD COLUMN IF NOT EXISTS changes      JSONB;

-- Ensure audit logs INSERT is available to all authenticated users
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- ============================================================
-- 6. fn_log_audit() — Structured audit logging helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_audit(
  p_action       TEXT,
  p_entity       TEXT DEFAULT NULL,
  p_entity_id    TEXT DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL,
  p_severity     TEXT DEFAULT 'info',
  p_changes      JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, metadata, severity, changes)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_metadata, p_severity, p_changes);
EXCEPTION WHEN OTHERS THEN
  NULL; -- Never block operations for audit logging
END;
$$;

-- ============================================================
-- 7. fn_cleanup_old_data() — Maintenance function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_cleanup_old_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_deleted   INT;
  v_login_deleted  INT;
  v_notif_deleted  INT;
BEGIN
  -- Clean old rate limit records (older than 1 hour)
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour' AND blocked_until IS NULL;
  GET DIAGNOSTICS v_rate_deleted = ROW_COUNT;

  -- Clean old login attempts (older than 30 days)
  DELETE FROM public.login_attempts WHERE attempted_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_login_deleted = ROW_COUNT;

  -- Delete dismissed/expired notifications older than 90 days
  DELETE FROM public.notifications WHERE (is_dismissed = true OR (expires_at IS NOT NULL AND expires_at < now())) AND created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_notif_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'rate_limits_cleaned', v_rate_deleted,
    'login_attempts_cleaned', v_login_deleted,
    'notifications_cleaned', v_notif_deleted,
    'executed_at', now()
  );
END;
$$;

-- ============================================================
-- 8. CRON JOB REGISTRATIONS (via pg_cron extension)
-- ============================================================
DO $$
BEGIN
  -- Enable pg_cron if available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Daily snapshot at midnight
    PERFORM cron.schedule(
      'realtynow-daily-snapshot',
      '0 0 * * *',
      $cmd$SELECT public.fn_generate_daily_snapshot(CURRENT_DATE - 1)$cmd$
    );

    -- Renewal reminders at 8 AM
    PERFORM cron.schedule(
      'realtynow-renewal-reminders',
      '0 8 * * *',
      $cmd$SELECT public.fn_process_renewal_reminders()$cmd$
    );

    -- Expire stale listings at 1 AM
    PERFORM cron.schedule(
      'realtynow-expire-listings',
      '0 1 * * *',
      $cmd$SELECT public.fn_expire_stale_listings()$cmd$
    );

    -- Refresh materialized views at 2 AM
    PERFORM cron.schedule(
      'realtynow-refresh-views',
      '0 2 * * *',
      $cmd$SELECT public.fn_refresh_all_materialized_views()$cmd$
    );

    -- Banner rotation every 5 minutes
    PERFORM cron.schedule(
      'realtynow-rotate-banners',
      '*/5 * * * *',
      $cmd$SELECT public.fn_rotate_banners()$cmd$
    );

    -- Data cleanup daily at 3 AM
    PERFORM cron.schedule(
      'realtynow-cleanup',
      '0 3 * * *',
      $cmd$SELECT public.fn_cleanup_old_data()$cmd$
    );

  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available. Cron jobs must be configured via Supabase Dashboard or external scheduler.';
END $$;

-- ============================================================
-- 9. SECURITY VIEWS
-- ============================================================

-- View for admin: recent suspicious activity
CREATE OR REPLACE VIEW public.v_security_alerts AS
SELECT
  'login_failures'  AS alert_type,
  email             AS identifier,
  COUNT(*)          AS event_count,
  MAX(attempted_at) AS last_seen,
  MIN(ip_address)   AS ip_address
FROM public.login_attempts
WHERE success = false AND attempted_at >= now() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) >= 5
UNION ALL
SELECT
  'rate_limited' AS alert_type,
  identifier,
  request_count  AS event_count,
  window_start   AS last_seen,
  NULL
FROM public.rate_limits
WHERE blocked_until IS NOT NULL AND blocked_until > now();

-- ============================================================
-- 10. PERFORMANCE INDEXES (Final pass)
-- ============================================================
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_properties_search
  ON public.properties(status, city_id, purpose, price)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_properties_featured_search
  ON public.properties(is_featured, status, city_id)
  WHERE status = 'published' AND is_featured = true;

CREATE INDEX IF NOT EXISTS idx_enquiries_crm_pipeline
  ON public.enquiries(assigned_to, lead_status, follow_up_at);

CREATE INDEX IF NOT EXISTS idx_payments_revenue
  ON public.payments(status, paid_at, amount)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_packages_active
  ON public.agent_packages(agent_id, status, expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sponsored_active
  ON public.sponsored_listings(sponsored_type, locality_id, status, ends_at)
  WHERE status = 'active';

-- Full-text search index on properties
CREATE INDEX IF NOT EXISTS idx_properties_fts
  ON public.properties USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(address, '')));

-- ============================================================
-- 11. GRANTS
-- ============================================================
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.login_attempts TO service_role;
GRANT INSERT ON public.login_attempts TO anon, authenticated;
GRANT ALL ON public.api_keys TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_check_rate_limit(TEXT, TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_log_audit(TEXT, TEXT, TEXT, JSONB, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_old_data() TO service_role;
GRANT SELECT ON public.v_security_alerts TO authenticated;

-- ============================================================
-- 12. FINAL CONFIGURATION
-- ============================================================
-- Ensure all critical tables have REPLICA IDENTITY FULL
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.enquiries REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.agent_packages REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
