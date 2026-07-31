-- =============================================================================
-- Migration: 20260726070000_0035_notifications_enterprise.sql
-- Description: Enterprise multi-channel notification system with templates,
--              preferences, delivery tracking, push tokens, and quiet hours.
-- =============================================================================

-- ============================================================
-- 1. EXPAND notifications TABLE
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS channel         TEXT[] DEFAULT ARRAY['in_app'],
  ADD COLUMN IF NOT EXISTS delivered_via   TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS priority        TEXT NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('low','medium','high','urgent')),
  ADD COLUMN IF NOT EXISTS template_key    TEXT,
  ADD COLUMN IF NOT EXISTS template_vars   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata        JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_dismissed    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_url      TEXT,
  ADD COLUMN IF NOT EXISTS action_label    TEXT,
  ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS group_key       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_notifications_user      ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority  ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_group     ON public.notifications(group_key);

-- Enable Realtime on notifications (already in some migrations, ensure idempotent)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ============================================================
-- 2. NOTIFICATION_TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  title_template  TEXT NOT NULL,
  body_template   TEXT NOT NULL,
  channels        TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  action_url_tpl  TEXT,
  action_label    TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  category        TEXT NOT NULL DEFAULT 'general',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_templates_read" ON public.notification_templates;
CREATE POLICY "notif_templates_read" ON public.notification_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "notif_templates_admin_write" ON public.notification_templates;
CREATE POLICY "notif_templates_admin_write" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 3. NOTIFICATION_PREFERENCES TABLE (per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app           BOOLEAN NOT NULL DEFAULT true,
  email            BOOLEAN NOT NULL DEFAULT true,
  sms              BOOLEAN NOT NULL DEFAULT true,
  whatsapp         BOOLEAN NOT NULL DEFAULT false,
  push             BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end   TIME DEFAULT '07:00',
  timezone         TEXT DEFAULT 'Asia/Kolkata',
  -- Category preferences
  marketing        BOOLEAN NOT NULL DEFAULT true,
  property_updates BOOLEAN NOT NULL DEFAULT true,
  lead_updates     BOOLEAN NOT NULL DEFAULT true,
  payment_updates  BOOLEAN NOT NULL DEFAULT true,
  system_alerts    BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_own" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. PUSH_TOKENS TABLE (for PWA/mobile push)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL DEFAULT 'web'
                CHECK (platform IN ('web','android','ios')),
  device_name TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_used   TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_own" ON public.push_tokens;
CREATE POLICY "push_tokens_own" ON public.push_tokens
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

-- ============================================================
-- 5. NOTIFICATION_DELIVERY_LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('sent','delivered','failed','bounced','opened')),
  provider        TEXT,
  provider_ref    TEXT,
  error_message   TEXT,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_delivery_admin" ON public.notification_delivery_log;
CREATE POLICY "notif_delivery_admin" ON public.notification_delivery_log
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "notif_delivery_insert" ON public.notification_delivery_log;
CREATE POLICY "notif_delivery_insert" ON public.notification_delivery_log
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notif_delivery_notif  ON public.notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_delivery_status ON public.notification_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_notif_delivery_at     ON public.notification_delivery_log(attempted_at DESC);

-- ============================================================
-- 6. SEED NOTIFICATION TEMPLATES
-- ============================================================
INSERT INTO public.notification_templates (key, name, title_template, body_template, channels, priority, category) VALUES
  -- Property workflow
  ('property_submitted',    'Property Submitted',    'Property "{{title}}" Submitted',    'Your property listing has been submitted for review. We will verify it within 24 hours.', ARRAY['in_app','email'], 'medium', 'property'),
  ('property_approved',     'Property Approved',     'Property Approved! 🎉',             'Congratulations! Your property "{{title}}" has been approved and is now live.', ARRAY['in_app','email','sms'], 'high', 'property'),
  ('property_rejected',     'Property Rejected',     'Property Needs Changes',            'Your property "{{title}}" was not approved. Reason: {{reason}}', ARRAY['in_app','email'], 'high', 'property'),
  ('property_expiring',     'Listing Expiring',      'Listing Expiring in {{days}} Days', 'Your property "{{title}}" will expire soon. Renew to keep it live.', ARRAY['in_app','email'], 'high', 'property'),
  ('property_expired',      'Listing Expired',       'Listing Has Expired',               'Your property "{{title}}" has expired and is no longer visible. Renew to republish.', ARRAY['in_app','email','sms'], 'urgent', 'property'),
  -- Leads / CRM
  ('lead_new',              'New Lead',              'New Enquiry Received! 🔥',          '{{customer_name}} is interested in {{property_title}}. Call: {{phone}}', ARRAY['in_app','sms'], 'high', 'crm'),
  ('lead_assigned',         'Lead Assigned',         'New Lead Assigned to You',          'Lead #{{lead_id}} from {{customer_name}} has been assigned to you. Check your CRM.', ARRAY['in_app'], 'high', 'crm'),
  ('lead_won',              'Lead Won',              'Deal Closed! 🏆',                   'Congratulations! You closed a deal worth ₹{{value}}. Well done!', ARRAY['in_app','email'], 'high', 'crm'),
  ('follow_up_reminder',    'Follow-Up Reminder',    'Follow-Up Due: {{customer_name}}',  'You have a follow-up scheduled with {{customer_name}} at {{time}}.', ARRAY['in_app','sms'], 'medium', 'crm'),
  -- Payments
  ('payment_confirmed',     'Payment Confirmed',     'Payment Received ✅',               'Your payment of ₹{{amount}} has been confirmed. Invoice #{{invoice_number}} is ready.', ARRAY['in_app','email'], 'high', 'payment'),
  ('payment_failed',        'Payment Failed',        'Payment Failed ❌',                 'Your payment of ₹{{amount}} could not be processed. Please try again.', ARRAY['in_app','email','sms'], 'urgent', 'payment'),
  ('invoice_ready',         'Invoice Ready',         'Invoice #{{invoice_number}} Ready', 'Your invoice for {{description}} is ready to download.', ARRAY['in_app','email'], 'medium', 'payment'),
  -- Renewals
  ('renewal_30d',           'Renewal Reminder 30d',  'Subscription Expiring in 30 Days',  'Your {{package_name}} package expires in 30 days. Renew early to save {{discount}}%!', ARRAY['in_app','email'], 'medium', 'renewal'),
  ('renewal_7d',            'Renewal Reminder 7d',   '⚠️ Subscription Expiring in 7 Days','Your listings will be removed in 7 days! Renew now to stay live.', ARRAY['in_app','email','sms'], 'urgent', 'renewal'),
  ('renewal_success',       'Renewal Success',       'Subscription Renewed! 🎉',          'Your {{package_name}} package has been renewed successfully. Valid until {{expiry}}.', ARRAY['in_app','email'], 'high', 'renewal'),
  -- System
  ('welcome',               'Welcome',               'Welcome to RealtyNow! 🏠',          'Welcome {{name}}! Your account is ready. Start exploring thousands of properties.', ARRAY['in_app','email'], 'medium', 'system'),
  ('kyc_approved',          'KYC Approved',          'KYC Verification Approved ✅',      'Your identity verification has been approved. You now have full access.', ARRAY['in_app','email'], 'high', 'system'),
  ('kyc_rejected',          'KYC Rejected',          'KYC Verification Needs Resubmission','Your KYC documents could not be verified. Reason: {{reason}}', ARRAY['in_app','email'], 'high', 'system'),
  -- Appointments
  ('appointment_confirmed', 'Appointment Confirmed', 'Appointment Confirmed ✅',          'Your site visit for "{{property}}" on {{date}} at {{time}} is confirmed.', ARRAY['in_app','sms'], 'high', 'property'),
  ('appointment_cancelled', 'Appointment Cancelled', 'Appointment Cancelled',             'Your appointment for "{{property}}" on {{date}} has been cancelled.', ARRAY['in_app','sms'], 'medium', 'property')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. fn_send_notification() — Enhanced notification sender
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_send_notification(
  p_user_id      UUID,
  p_template_key TEXT DEFAULT NULL,
  p_vars         JSONB DEFAULT '{}',
  p_title        TEXT DEFAULT NULL,
  p_body         TEXT DEFAULT NULL,
  p_type         TEXT DEFAULT 'system',
  p_link         TEXT DEFAULT NULL,
  p_priority     TEXT DEFAULT 'medium',
  p_channel      TEXT[] DEFAULT ARRAY['in_app']
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template  public.notification_templates%ROWTYPE;
  v_title     TEXT;
  v_body      TEXT;
  v_channels  TEXT[];
  v_notif_id  UUID;
  v_prefs     public.notification_preferences%ROWTYPE;
BEGIN
  -- Load template if key provided
  IF p_template_key IS NOT NULL THEN
    SELECT * INTO v_template FROM public.notification_templates WHERE key = p_template_key AND is_active = true;
    IF FOUND THEN
      v_title := v_template.title_template;
      v_body  := v_template.body_template;
      v_channels := v_template.channels;
      p_priority := v_template.priority;
      -- Simple variable substitution
      IF p_vars IS NOT NULL THEN
        DECLARE k TEXT; v TEXT;
        BEGIN
          FOR k, v IN SELECT * FROM jsonb_each_text(p_vars) LOOP
            v_title := REPLACE(v_title, '{{' || k || '}}', COALESCE(v, ''));
            v_body  := REPLACE(v_body,  '{{' || k || '}}', COALESCE(v, ''));
          END LOOP;
        END;
      END IF;
    END IF;
  ELSE
    v_title := p_title;
    v_body  := p_body;
    v_channels := p_channel;
  END IF;

  IF v_title IS NULL THEN RETURN NULL; END IF;

  -- Check user preferences
  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;

  -- Filter channels based on preferences
  IF FOUND THEN
    v_channels := ARRAY(
      SELECT c FROM unnest(v_channels) c
      WHERE
        (c = 'in_app'   AND v_prefs.in_app = true)   OR
        (c = 'email'    AND v_prefs.email = true)     OR
        (c = 'sms'      AND v_prefs.sms = true)       OR
        (c = 'whatsapp' AND v_prefs.whatsapp = true)  OR
        (c = 'push'     AND v_prefs.push = true)
    );
  END IF;

  -- Always ensure in_app is included unless explicitly excluded
  IF 'in_app' = ANY(COALESCE(v_channels, ARRAY['in_app'])) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, channel, priority, template_key, template_vars)
    VALUES (p_user_id, p_type, v_title, v_body, COALESCE(p_link, v_template.action_url_tpl), v_channels, p_priority, p_template_key, p_vars)
    RETURNING id INTO v_notif_id;
  END IF;

  RETURN v_notif_id;
END;
$$;

-- Update notify_user to use the new system
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.fn_send_notification(
    p_user_id, NULL, '{}', p_title, p_body, p_type, p_link, 'medium', ARRAY['in_app']
  );
END;
$$;

-- ============================================================
-- 8. fn_mark_notifications_read() — Bulk mark as read
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_mark_notifications_read(
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all unread for current user
    UPDATE public.notifications SET read_at = now(), updated_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
  ELSE
    UPDATE public.notifications SET read_at = now(), updated_at = now()
    WHERE id = ANY(p_notification_ids) AND user_id = auth.uid() AND read_at IS NULL;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 9. GRANTS
-- ============================================================
GRANT ALL ON public.notification_templates TO authenticated, service_role;
GRANT ALL ON public.notification_preferences TO authenticated, service_role;
GRANT ALL ON public.push_tokens TO authenticated, service_role;
GRANT ALL ON public.notification_delivery_log TO service_role;
GRANT SELECT ON public.notification_delivery_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_send_notification(UUID, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_mark_notifications_read(UUID[]) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_templates; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
