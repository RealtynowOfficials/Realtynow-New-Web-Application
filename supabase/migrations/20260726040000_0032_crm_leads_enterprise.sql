-- =============================================================================
-- Migration: 20260726040000_0032_crm_leads_enterprise.sql
-- Description: Full enterprise CRM — upgrades enquiries to a lead pipeline,
--              adds lead activities, notes, call logs, follow-up scheduler,
--              negotiation tracking, and assignment/transfer RPC functions.
-- =============================================================================

-- ============================================================
-- 1. EXPAND enquiries TABLE → Full CRM Lead Pipeline
-- ============================================================
ALTER TABLE public.enquiries
  -- Lead pipeline status (extends the basic status field)
  ADD COLUMN IF NOT EXISTS lead_status        TEXT NOT NULL DEFAULT 'new'
                              CHECK (lead_status IN ('new','assigned','contacted','site_visit','negotiation','won','lost','closed','spam','duplicate')),
  -- Assignment
  ADD COLUMN IF NOT EXISTS assigned_to        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Lead source & context
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'website'
                              CHECK (source IN ('website','portal','whatsapp','referral','direct','campaign','social','walk_in','call','import')),
  ADD COLUMN IF NOT EXISTS campaign_name      TEXT,
  ADD COLUMN IF NOT EXISTS utm_source         TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium         TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign       TEXT,
  -- Budget & preferences
  ADD COLUMN IF NOT EXISTS budget_min         NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS budget_max         NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS preferred_localities TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_types    TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_purpose  TEXT,
  ADD COLUMN IF NOT EXISTS preferred_bedrooms INT[],
  ADD COLUMN IF NOT EXISTS timeline           TEXT,   -- 'immediate', '1-3 months', '3-6 months', '6+ months'
  -- Priority
  ADD COLUMN IF NOT EXISTS priority           TEXT NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('low','medium','high','urgent')),
  -- Follow-up
  ADD COLUMN IF NOT EXISTS follow_up_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_count      INT NOT NULL DEFAULT 0,
  -- Closure
  ADD COLUMN IF NOT EXISTS closed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_reason     TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason        TEXT,
  ADD COLUMN IF NOT EXISTS conversion_value   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS closed_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  -- Metadata
  ADD COLUMN IF NOT EXISTS tags               TEXT[],
  ADD COLUMN IF NOT EXISTS custom_fields      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add updated_at trigger to enquiries
CREATE OR REPLACE FUNCTION public.handle_enquiries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_enquiries_updated_at ON public.enquiries;
CREATE TRIGGER on_enquiries_updated_at
  BEFORE UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.handle_enquiries_updated_at();

-- Additional indexes for CRM queries
CREATE INDEX IF NOT EXISTS idx_enquiries_lead_status  ON public.enquiries(lead_status);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_to  ON public.enquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_enquiries_priority     ON public.enquiries(priority);
CREATE INDEX IF NOT EXISTS idx_enquiries_follow_up    ON public.enquiries(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_created      ON public.enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_source       ON public.enquiries(source);
CREATE INDEX IF NOT EXISTS idx_enquiries_property     ON public.enquiries(property_id);

-- Update RLS to allow staff to view/manage all leads
DROP POLICY IF EXISTS "enquiries_select" ON public.enquiries;
CREATE POLICY "enquiries_select" ON public.enquiries
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "enquiries_update" ON public.enquiries;
CREATE POLICY "enquiries_update" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    OR public.is_staff()
  )
  WITH CHECK (true);

-- Enable Realtime on enquiries
ALTER TABLE public.enquiries REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ============================================================
-- 2. LEAD ACTIVITIES TABLE (complete event timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type   TEXT NOT NULL
                    CHECK (activity_type IN (
                      'created','assigned','transferred','status_changed',
                      'call_made','call_received','call_missed',
                      'email_sent','email_received',
                      'whatsapp_sent','whatsapp_received',
                      'sms_sent','note_added','site_visit_scheduled',
                      'site_visit_completed','proposal_sent','negotiation_started',
                      'follow_up_scheduled','follow_up_completed',
                      'document_shared','won','lost','closed','reopened'
                    )),
  title           TEXT NOT NULL,
  description     TEXT,
  old_value       TEXT,
  new_value       TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  duration_seconds INT,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_activities_read" ON public.lead_activities;
CREATE POLICY "lead_activities_read" ON public.lead_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enquiries e
      WHERE e.id = lead_id
        AND (e.customer_id = auth.uid() OR e.agent_id = auth.uid()
             OR e.assigned_to = auth.uid() OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "lead_activities_insert" ON public.lead_activities;
CREATE POLICY "lead_activities_insert" ON public.lead_activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead    ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_actor   ON public.lead_activities(actor_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type    ON public.lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created ON public.lead_activities(created_at DESC);

-- ============================================================
-- 3. LEAD NOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  is_private  BOOLEAN NOT NULL DEFAULT false,  -- private = only author and admin can see
  pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_notes_read" ON public.lead_notes;
CREATE POLICY "lead_notes_read" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (
    (NOT is_private AND EXISTS (
      SELECT 1 FROM public.enquiries e
      WHERE e.id = lead_id
        AND (e.customer_id = auth.uid() OR e.agent_id = auth.uid() OR e.assigned_to = auth.uid())
    ))
    OR auth.uid() = author_id
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "lead_notes_write" ON public.lead_notes;
CREATE POLICY "lead_notes_write" ON public.lead_notes
  FOR ALL TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead   ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_author ON public.lead_notes(author_id);

-- ============================================================
-- 4. CALL LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL DEFAULT 'outbound'
                     CHECK (direction IN ('outbound','inbound')),
  status           TEXT NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('completed','missed','busy','failed','voicemail')),
  duration_seconds INT,
  phone_number     TEXT,
  recording_url    TEXT,
  notes            TEXT,
  called_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_logs_read" ON public.call_logs;
CREATE POLICY "call_logs_read" ON public.call_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "call_logs_write" ON public.call_logs;
CREATE POLICY "call_logs_write" ON public.call_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id OR public.is_staff());

CREATE INDEX IF NOT EXISTS idx_call_logs_lead    ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent   ON public.call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_called  ON public.call_logs(called_at DESC);

-- ============================================================
-- 5. FOLLOW-UP SCHEDULER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follow_up_scheduler (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  scheduled_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  type             TEXT NOT NULL DEFAULT 'call'
                     CHECK (type IN ('call','meeting','email','whatsapp','site_visit','other')),
  title            TEXT NOT NULL,
  notes            TEXT,
  reminder_sent    BOOLEAN NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  outcome          TEXT,
  outcome_type     TEXT
                     CHECK (outcome_type IN ('positive','neutral','negative','no_response','rescheduled','cancelled') OR outcome_type IS NULL),
  next_follow_up_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_scheduler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow_up_read" ON public.follow_up_scheduler;
CREATE POLICY "follow_up_read" ON public.follow_up_scheduler
  FOR SELECT TO authenticated
  USING (auth.uid() = scheduled_by OR auth.uid() = assigned_to OR public.is_staff());

DROP POLICY IF EXISTS "follow_up_write" ON public.follow_up_scheduler;
CREATE POLICY "follow_up_write" ON public.follow_up_scheduler
  FOR ALL TO authenticated
  USING (auth.uid() = scheduled_by OR public.is_staff())
  WITH CHECK (auth.uid() = scheduled_by OR public.is_staff());

CREATE INDEX IF NOT EXISTS idx_follow_up_lead       ON public.follow_up_scheduler(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_agent      ON public.follow_up_scheduler(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_up_scheduled  ON public.follow_up_scheduler(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_follow_up_completed  ON public.follow_up_scheduler(completed_at);

-- ============================================================
-- 6. CRM VIEWS
-- ============================================================

-- Pipeline view by stage
CREATE OR REPLACE VIEW public.v_crm_pipeline AS
SELECT
  lead_status,
  COUNT(*)                                        AS lead_count,
  SUM(COALESCE(budget_max, 0))                   AS total_budget,
  AVG(COALESCE(budget_max, 0))                   AS avg_budget,
  COUNT(*) FILTER (WHERE priority = 'high')      AS high_priority,
  COUNT(*) FILTER (WHERE priority = 'urgent')    AS urgent_priority,
  COUNT(*) FILTER (WHERE follow_up_at < now())   AS overdue_follow_ups
FROM public.enquiries
GROUP BY lead_status;

-- Agent lead summary
CREATE OR REPLACE VIEW public.v_agent_lead_summary AS
SELECT
  p.id AS agent_id,
  p.first_name || ' ' || COALESCE(p.last_name, '') AS agent_name,
  p.email,
  COUNT(e.id)                                              AS total_leads,
  COUNT(e.id) FILTER (WHERE e.lead_status = 'won')        AS won_leads,
  COUNT(e.id) FILTER (WHERE e.lead_status = 'lost')       AS lost_leads,
  COUNT(e.id) FILTER (WHERE e.lead_status = 'new')        AS new_leads,
  COUNT(e.id) FILTER (WHERE e.follow_up_at < now()
    AND e.lead_status NOT IN ('won','lost','closed'))      AS overdue_leads,
  ROUND(
    CASE WHEN COUNT(e.id) > 0
    THEN COUNT(e.id) FILTER (WHERE e.lead_status = 'won')::NUMERIC / COUNT(e.id) * 100
    ELSE 0 END, 2
  )                                                        AS conversion_rate,
  SUM(COALESCE(e.conversion_value, 0))                    AS total_revenue
FROM public.profiles p
LEFT JOIN public.enquiries e ON e.assigned_to = p.id
WHERE p.role IN ('agent','sales_executive')
GROUP BY p.id, p.first_name, p.last_name, p.email;

-- ============================================================
-- 7. fn_assign_lead() — Atomic Lead Assignment RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_assign_lead(
  p_lead_id    UUID,
  p_agent_id   UUID,
  p_assigned_by UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_agent UUID;
BEGIN
  -- Only staff can assign leads
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only staff can assign leads';
  END IF;

  SELECT assigned_to INTO v_old_agent FROM public.enquiries WHERE id = p_lead_id;

  UPDATE public.enquiries
  SET
    assigned_to  = p_agent_id,
    assigned_by  = p_assigned_by,
    assigned_at  = now(),
    lead_status  = CASE WHEN lead_status = 'new' THEN 'assigned' ELSE lead_status END,
    updated_at   = now()
  WHERE id = p_lead_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  -- Log activity
  INSERT INTO public.lead_activities (lead_id, actor_id, activity_type, title, old_value, new_value, is_system)
  VALUES (p_lead_id, p_assigned_by, 'assigned',
    'Lead assigned to agent',
    v_old_agent::TEXT, p_agent_id::TEXT, true);

  -- Notify new assignee
  PERFORM public.notify_user(p_agent_id, 'lead_assigned',
    'New Lead Assigned',
    'A new lead has been assigned to you. Check your CRM.',
    '/agent/crm');

  RETURN jsonb_build_object('success', true, 'lead_id', p_lead_id, 'agent_id', p_agent_id);
END;
$$;

-- ============================================================
-- 8. fn_transfer_lead() — Lead Transfer with Audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_transfer_lead(
  p_lead_id     UUID,
  p_to_agent_id UUID,
  p_reason      TEXT DEFAULT NULL,
  p_actor_id    UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_agent UUID;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only staff can transfer leads';
  END IF;

  SELECT assigned_to INTO v_from_agent FROM public.enquiries WHERE id = p_lead_id;

  UPDATE public.enquiries
  SET assigned_to = p_to_agent_id, assigned_at = now(), assigned_by = p_actor_id, updated_at = now()
  WHERE id = p_lead_id;

  INSERT INTO public.lead_activities (lead_id, actor_id, activity_type, title, old_value, new_value, description, is_system)
  VALUES (p_lead_id, p_actor_id, 'transferred',
    'Lead transferred to another agent',
    v_from_agent::TEXT, p_to_agent_id::TEXT, p_reason, true);

  PERFORM public.notify_user(p_to_agent_id, 'lead_transferred',
    'Lead Transferred to You',
    'A lead has been transferred to you. Check your CRM pipeline.',
    '/agent/crm');

  IF v_from_agent IS NOT NULL THEN
    PERFORM public.notify_user(v_from_agent, 'lead_transferred_away',
      'Lead Transferred Away',
      'One of your leads has been transferred to another agent.',
      '/agent/crm');
  END IF;

  RETURN jsonb_build_object('success', true, 'lead_id', p_lead_id, 'from', v_from_agent, 'to', p_to_agent_id);
END;
$$;

-- ============================================================
-- 9. fn_update_lead_status() — Status change with activity log
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_lead_status(
  p_lead_id    UUID,
  p_new_status TEXT,
  p_reason     TEXT DEFAULT NULL,
  p_value      NUMERIC DEFAULT NULL,
  p_actor_id   UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  SELECT lead_status INTO v_old_status FROM public.enquiries WHERE id = p_lead_id;

  UPDATE public.enquiries
  SET
    lead_status      = p_new_status,
    closed_at        = CASE WHEN p_new_status IN ('won','lost','closed') THEN now() ELSE closed_at END,
    closure_reason   = COALESCE(p_reason, closure_reason),
    conversion_value = COALESCE(p_value, conversion_value),
    updated_at       = now()
  WHERE id = p_lead_id
    AND (auth.uid() = assigned_to OR auth.uid() = agent_id OR public.is_staff());

  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found or access denied'; END IF;

  INSERT INTO public.lead_activities (lead_id, actor_id, activity_type, title, old_value, new_value, description, is_system)
  VALUES (p_lead_id, p_actor_id,
    CASE p_new_status WHEN 'won' THEN 'won' WHEN 'lost' THEN 'lost' WHEN 'closed' THEN 'closed' ELSE 'status_changed' END,
    'Lead status changed to ' || p_new_status,
    v_old_status, p_new_status, p_reason, false);

  -- Recalculate agent score on win/loss
  IF p_new_status IN ('won','lost') THEN
    PERFORM public.fn_calculate_agent_score(
      (SELECT COALESCE(assigned_to, agent_id) FROM public.enquiries WHERE id = p_lead_id)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'lead_id', p_lead_id, 'status', p_new_status);
END;
$$;

-- ============================================================
-- 10. TRIGGER: Auto-log activity on enquiry INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_lead_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, actor_id, activity_type, title, is_system)
  VALUES (NEW.id, NEW.customer_id, 'created', 'Lead created from ' || COALESCE(NEW.source, 'website'), true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lead_created_log ON public.enquiries;
CREATE TRIGGER on_lead_created_log
  AFTER INSERT ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_lead_created();

-- ============================================================
-- 11. fn_get_crm_dashboard_stats() — Dashboard stats RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_crm_dashboard_stats(p_agent_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_filter_agent UUID := COALESCE(p_agent_id, CASE WHEN public.is_staff() THEN NULL ELSE auth.uid() END);
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total',       COUNT(*),
    'new',         COUNT(*) FILTER (WHERE lead_status = 'new'),
    'assigned',    COUNT(*) FILTER (WHERE lead_status = 'assigned'),
    'contacted',   COUNT(*) FILTER (WHERE lead_status = 'contacted'),
    'site_visit',  COUNT(*) FILTER (WHERE lead_status = 'site_visit'),
    'negotiation', COUNT(*) FILTER (WHERE lead_status = 'negotiation'),
    'won',         COUNT(*) FILTER (WHERE lead_status = 'won'),
    'lost',        COUNT(*) FILTER (WHERE lead_status = 'lost'),
    'closed',      COUNT(*) FILTER (WHERE lead_status = 'closed'),
    'overdue',     COUNT(*) FILTER (WHERE follow_up_at < now() AND lead_status NOT IN ('won','lost','closed')),
    'total_revenue', COALESCE(SUM(conversion_value) FILTER (WHERE lead_status = 'won'), 0),
    'conversion_rate', CASE WHEN COUNT(*) > 0 THEN
      ROUND(COUNT(*) FILTER (WHERE lead_status = 'won')::NUMERIC / COUNT(*) * 100, 2)
    ELSE 0 END
  ) INTO v_result
  FROM public.enquiries
  WHERE (v_filter_agent IS NULL OR assigned_to = v_filter_agent OR agent_id = v_filter_agent);

  RETURN v_result;
END;
$$;

-- ============================================================
-- 12. GRANTS
-- ============================================================
GRANT ALL ON public.lead_activities TO authenticated, service_role;
GRANT ALL ON public.lead_notes TO authenticated, service_role;
GRANT ALL ON public.call_logs TO authenticated, service_role;
GRANT ALL ON public.follow_up_scheduler TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assign_lead(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_transfer_lead(UUID, UUID, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_status(UUID, TEXT, TEXT, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_crm_dashboard_stats(UUID) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notes; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_scheduler; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
