-- Migration: 20260804040000_0060_fcm_push_notifications.sql
-- Description: Firebase Cloud Messaging (Web Push) support.
--
--              Reuses existing infrastructure rather than duplicating it:
--                - public.push_tokens (migration 0035) already has the
--                  exact shape needed for FCM token storage (user_id, token,
--                  platform, is_active, last_used) with correct owner-scoped
--                  RLS — never wired to any frontend code until now.
--                - public.notifications / notify_user() / fn_send_notification()
--                  (migrations 0001, 0006, 0035) remain the single in-app
--                  notification chokepoint. Every one of the ~19 existing
--                  trigger call sites (property status, enquiries,
--                  appointments, payments, renewals, admin_send_notification)
--                  already funnels through notify_user() — so this migration
--                  makes notify_user() ALSO fire an async push delivery
--                  call, which gives every existing + future trigger push
--                  support for free without touching each one individually.
--                - public.notification_templates / notification_preferences /
--                  notification_delivery_log (migration 0035) are reused
--                  as-is for the admin Templates/Analytics/Delivery Status UI.
--
--              New in this migration: pg_net (for the async HTTP call out
--              of Postgres) and scheduled_notifications (admin "Schedule
--              Notification" feature, which has no prior equivalent).
--
--              The outbound call target uses the project's public anon key
--              — not a secret, it's already shipped in the client bundle —
--              purely so pg_net's request passes through Supabase's API
--              gateway; the send-push Edge Function does the privileged
--              work itself using its own service-role secret, and only
--              acts on notification rows that already exist (so this can't
--              be used to inject arbitrary new notification content).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- 1. scheduled_notifications — admin "Schedule Notification"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  body           TEXT,
  link           TEXT,
  target         TEXT NOT NULL CHECK (target IN ('all', 'customers', 'agents', 'builders', 'single_user')),
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_for  TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  recipients_count INT,
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status_time ON public.scheduled_notifications(status, scheduled_for);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_notifications_admin" ON public.scheduled_notifications;
CREATE POLICY "scheduled_notifications_admin" ON public.scheduled_notifications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 2. fn_dispatch_push — async, best-effort push trigger. Never blocks or
--    fails the calling transaction: pg_net queues the HTTP request and
--    returns immediately, and this whole call is wrapped so a network
--    hiccup can never break an in-app notification insert.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_dispatch_push(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://jbopkeanshuetjjqofef.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impib3BrZWFuc2h1ZXRqanFvZmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDkzNDQsImV4cCI6MjEwMTMyNTM0NH0.iZlUhrUfkvn4fNAfQegUvIaygGTI6Q8UZkIr1ycr3e4'
    ),
    body := jsonb_build_object('notification_id', p_notification_id)
  );
EXCEPTION WHEN OTHERS THEN
  -- Push delivery is best-effort; never let it break the in-app notification.
  NULL;
END;
$$;

-- ============================================================
-- 3. Hook push dispatch into the existing single chokepoint.
--    fn_send_notification() already inserts the notifications row and
--    returns its id — just add the dispatch call at the end.
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
  IF p_template_key IS NOT NULL THEN
    SELECT * INTO v_template FROM public.notification_templates WHERE key = p_template_key AND is_active = true;
    IF FOUND THEN
      v_title := v_template.title_template;
      v_body  := v_template.body_template;
      v_channels := v_template.channels;
      p_priority := v_template.priority;
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

  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;

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

  IF 'in_app' = ANY(COALESCE(v_channels, ARRAY['in_app'])) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, channel, priority, template_key, template_vars)
    VALUES (p_user_id, p_type, v_title, v_body, COALESCE(p_link, v_template.action_url_tpl), v_channels, p_priority, p_template_key, p_vars)
    RETURNING id INTO v_notif_id;

    -- Fire push (best-effort, async) unless the user has explicitly opted out.
    IF v_prefs.user_id IS NULL OR v_prefs.push IS DISTINCT FROM false THEN
      PERFORM public.fn_dispatch_push(v_notif_id);
    END IF;
  END IF;

  RETURN v_notif_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_dispatch_push(UUID) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_delivery_log; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
