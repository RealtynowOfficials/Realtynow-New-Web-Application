-- =============================================================================
-- Migration: 20260818150000_0108_multi_role_crm_sync_master.sql
-- Description: Multi-Role Real Estate CRM Backend & Full Cross-Role Sync
--              Customer <-> Agent <-> Builder <-> Admin Unified Architecture
-- =============================================================================

-- ============================================================
-- 1. ENHANCE public.enquiries (LEADS)
-- ============================================================
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS builder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enquiries_builder_id ON public.enquiries(builder_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_customer_id ON public.enquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_agent_id ON public.enquiries(agent_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_to ON public.enquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries(created_at DESC);

-- Multi-Role RLS for enquiries
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquiries_select" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries_select_multi_role" ON public.enquiries;
CREATE POLICY "enquiries_select_multi_role" ON public.enquiries
  FOR SELECT TO authenticated
  USING (
    -- Customer sees own enquiries
    auth.uid() = customer_id
    -- Agent sees direct or assigned enquiries
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    -- Builder sees enquiries for their properties / company
    OR auth.uid() = builder_id
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
    -- Admin / Staff sees all
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "enquiries_update" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries_update_multi_role" ON public.enquiries;
CREATE POLICY "enquiries_update_multi_role" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    OR auth.uid() = builder_id
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
    OR public.is_staff()
  )
  WITH CHECK (true);

-- ============================================================
-- 2. ENHANCE public.appointments
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS builder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_builder_id ON public.appointments(builder_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent_id ON public.appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at DESC);

-- Multi-Role RLS for appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_multi_role" ON public.appointments;
CREATE POLICY "appointments_select_multi_role" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = builder_id
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_multi_role" ON public.appointments;
CREATE POLICY "appointments_update_multi_role" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = builder_id
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
    OR public.is_staff()
  )
  WITH CHECK (true);

-- ============================================================
-- 3. ENHANCE public.agent_tasks
-- ============================================================
ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'other'
    CHECK (task_type IN ('call', 'follow_up', 'site_visit', 'appointment', 'document', 'other')),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status ON public.agent_tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_due_date ON public.agent_tasks(due_date);

DROP POLICY IF EXISTS "agent_tasks_select" ON public.agent_tasks;
CREATE POLICY "agent_tasks_select" ON public.agent_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_id OR auth.uid() = created_by OR public.is_staff());

DROP POLICY IF EXISTS "agent_tasks_insert" ON public.agent_tasks;
CREATE POLICY "agent_tasks_insert" ON public.agent_tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "agent_tasks_update" ON public.agent_tasks;
CREATE POLICY "agent_tasks_update" ON public.agent_tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id OR auth.uid() = created_by OR public.is_staff())
  WITH CHECK (auth.uid() = agent_id OR auth.uid() = created_by OR public.is_staff());

DROP POLICY IF EXISTS "agent_tasks_delete" ON public.agent_tasks;
CREATE POLICY "agent_tasks_delete" ON public.agent_tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = agent_id OR auth.uid() = created_by OR public.is_staff());

-- ============================================================
-- 4. CANONICAL RPC: submit_contact_lead (UNIFIED MULTI-ROLE)
-- ============================================================
DROP FUNCTION IF EXISTS public.submit_contact_lead(UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_contact_lead;

CREATE OR REPLACE FUNCTION public.submit_contact_lead(
  p_property_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_customer_id UUID;
  v_property_title TEXT;
  v_owner_id UUID;
  v_owner_role TEXT;
  v_builder_id UUID := NULL;
  v_target_agent_id UUID := p_agent_id;
  v_existing_lead_id UUID;
BEGIN
  -- Validate phone
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;

  -- Validate property and find owner
  IF p_property_id IS NOT NULL THEN
    SELECT p.title, p.assigned_agent_id, p.owner_id, pr.role
    INTO v_property_title, v_target_agent_id, v_owner_id, v_owner_role
    FROM public.properties p
    LEFT JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = p_property_id;

    IF v_target_agent_id IS NULL AND p_agent_id IS NOT NULL THEN
      v_target_agent_id := p_agent_id;
    END IF;

    IF v_owner_role = 'builder' THEN
      v_builder_id := v_owner_id;
    END IF;
  END IF;

  -- Determine customer_id if authenticated
  IF auth.uid() IS NOT NULL THEN
    v_customer_id := auth.uid();
  ELSE
    SELECT id INTO v_customer_id FROM public.profiles WHERE phone = trim(p_phone) LIMIT 1;
  END IF;

  -- Check for existing recent lead in last 24h
  SELECT id INTO v_existing_lead_id
  FROM public.enquiries
  WHERE phone = trim(p_phone)
    AND ((p_property_id IS NULL AND property_id IS NULL) OR property_id = p_property_id)
    AND created_at >= (now() - interval '24 hours')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_lead_id IS NOT NULL THEN
    UPDATE public.enquiries
    SET
      name = COALESCE(NULLIF(trim(p_name), ''), name),
      email = COALESCE(NULLIF(trim(p_email), ''), email),
      message = COALESCE(NULLIF(trim(p_message), ''), message),
      agent_id = COALESCE(agent_id, v_target_agent_id),
      assigned_to = COALESCE(assigned_to, v_target_agent_id),
      builder_id = COALESCE(builder_id, v_builder_id),
      updated_at = now()
    WHERE id = v_existing_lead_id;

    v_lead_id := v_existing_lead_id;
  ELSE
    INSERT INTO public.enquiries (
      name,
      phone,
      email,
      message,
      property_id,
      agent_id,
      assigned_to,
      builder_id,
      customer_id,
      source,
      status,
      lead_status,
      priority,
      created_at,
      updated_at
    ) VALUES (
      trim(COALESCE(p_name, 'Website Visitor')),
      trim(p_phone),
      NULLIF(trim(p_email), ''),
      NULLIF(trim(p_message), ''),
      p_property_id,
      v_target_agent_id,
      v_target_agent_id,
      v_builder_id,
      v_customer_id,
      'property_contact_agent',
      'new',
      'new',
      'high',
      now(),
      now()
    )
    RETURNING id INTO v_lead_id;
  END IF;

  -- Log Activity
  INSERT INTO public.lead_activities (
    lead_id,
    actor_id,
    activity_type,
    title,
    description,
    is_system,
    created_at
  ) VALUES (
    v_lead_id,
    v_customer_id,
    'created',
    'New Lead Received via Contact Agent',
    'Customer ' || trim(COALESCE(p_name, 'Visitor')) || ' (' || trim(p_phone) || ') enquired regarding ' || COALESCE(v_property_title, 'a listing'),
    true,
    now()
  );

  -- Notify Assigned Agent
  IF v_target_agent_id IS NOT NULL THEN
    PERFORM public.notify_user(
      v_target_agent_id,
      'lead',
      'New Lead: ' || trim(COALESCE(p_name, 'Visitor')),
      'Customer ' || trim(COALESCE(p_name, 'Visitor')) || ' (' || trim(p_phone) || ') enquired about ' || COALESCE(v_property_title, 'your property') || '.',
      '/agent/leads?leadId=' || v_lead_id::text
    );
  END IF;

  -- Notify Builder if applicable
  IF v_builder_id IS NOT NULL AND v_builder_id <> COALESCE(v_target_agent_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    PERFORM public.notify_user(
      v_builder_id,
      'lead',
      'New Enquiry for ' || COALESCE(v_property_title, 'Project'),
      'Customer ' || trim(COALESCE(p_name, 'Visitor')) || ' enquired for ' || COALESCE(v_property_title, 'your listing') || '.',
      '/builder/leads'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'assigned_agent_id', v_target_agent_id,
    'builder_id', v_builder_id,
    'message', 'Enquiry submitted successfully'
  );
END;
$$;

-- ============================================================
-- 5. CANONICAL RPC: submit_visit_request (UNIFIED MULTI-ROLE)
-- ============================================================
DROP FUNCTION IF EXISTS public.submit_visit_request(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_visit_request;

CREATE OR REPLACE FUNCTION public.submit_visit_request(
  p_property_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_visit_type TEXT DEFAULT 'in_person',
  p_notes TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_agent_id UUID;
  v_owner_id UUID;
  v_owner_role TEXT;
  v_builder_id UUID := NULL;
  v_appointment_id UUID;
  v_lead_id UUID;
  v_property_title TEXT;
  v_user_name TEXT;
  v_user_phone TEXT;
  v_user_email TEXT;
BEGIN
  -- Resolve Customer details
  IF auth.uid() IS NOT NULL THEN
    v_customer_id := auth.uid();
    SELECT
      COALESCE(NULLIF(trim(p_name), ''), first_name || ' ' || COALESCE(last_name, '')),
      COALESCE(NULLIF(trim(p_phone), ''), phone),
      COALESCE(NULLIF(trim(p_email), ''), email)
    INTO v_user_name, v_user_phone, v_user_email
    FROM public.profiles
    WHERE id = auth.uid();
  ELSE
    v_user_name := trim(COALESCE(p_name, 'Guest Customer'));
    v_user_phone := trim(COALESCE(p_phone, ''));
    v_user_email := trim(COALESCE(p_email, ''));
  END IF;

  IF v_user_phone IS NULL OR v_user_phone = '' THEN
    RAISE EXCEPTION 'Phone number is required for site visit scheduling.';
  END IF;

  -- Resolve Property, Agent & Builder
  SELECT p.assigned_agent_id, p.owner_id, p.title, pr.role
  INTO v_agent_id, v_owner_id, v_property_title, v_owner_role
  FROM public.properties p
  LEFT JOIN public.profiles pr ON pr.id = p.owner_id
  WHERE p.id = p_property_id;

  IF v_agent_id IS NULL THEN
    v_agent_id := v_owner_id;
  END IF;

  IF v_owner_role = 'builder' THEN
    v_builder_id := v_owner_id;
  END IF;

  -- Create or find Lead in enquiries
  SELECT id INTO v_lead_id
  FROM public.enquiries
  WHERE phone = v_user_phone
    AND property_id = p_property_id
    AND created_at >= (now() - interval '48 hours')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    INSERT INTO public.enquiries (
      name,
      phone,
      email,
      message,
      property_id,
      agent_id,
      assigned_to,
      builder_id,
      customer_id,
      source,
      status,
      lead_status,
      priority,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(v_user_name, 'Guest Customer'),
      v_user_phone,
      NULLIF(v_user_email, ''),
      COALESCE(p_notes, 'Site visit requested for ' || to_char(p_scheduled_at, 'YYYY-MM-DD HH24:MI')),
      p_property_id,
      v_agent_id,
      v_agent_id,
      v_builder_id,
      v_customer_id,
      'site_visit',
      'contacted',
      'site_visit',
      'urgent',
      now(),
      now()
    ) RETURNING id INTO v_lead_id;
  ELSE
    UPDATE public.enquiries
    SET
      lead_status = 'site_visit',
      status = 'contacted',
      agent_id = COALESCE(agent_id, v_agent_id),
      assigned_to = COALESCE(assigned_to, v_agent_id),
      builder_id = COALESCE(builder_id, v_builder_id),
      updated_at = now()
    WHERE id = v_lead_id;
  END IF;

  -- Insert Appointment linked to Lead
  INSERT INTO public.appointments (
    property_id,
    customer_id,
    agent_id,
    builder_id,
    lead_id,
    scheduled_at,
    visit_type,
    notes,
    name,
    phone,
    email,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    v_customer_id,
    v_agent_id,
    v_builder_id,
    v_lead_id,
    p_scheduled_at,
    COALESCE(p_visit_type, 'in_person'),
    p_notes,
    v_user_name,
    v_user_phone,
    v_user_email,
    'requested',
    now(),
    now()
  ) RETURNING id INTO v_appointment_id;

  -- Log Activity
  INSERT INTO public.lead_activities (
    lead_id,
    actor_id,
    activity_type,
    title,
    description,
    is_system,
    created_at
  ) VALUES (
    v_lead_id,
    v_customer_id,
    'site_visit_scheduled',
    'Site Visit Requested',
    'Scheduled for ' || to_char(p_scheduled_at, 'Dy, DD Mon YYYY at HH12:MI AM') || ' (' || COALESCE(p_visit_type, 'in_person') || ')',
    true,
    now()
  );

  -- Notify Assigned Agent
  IF v_agent_id IS NOT NULL THEN
    PERFORM public.notify_user(
      v_agent_id,
      'appointment',
      'New Site Visit Request: ' || COALESCE(v_user_name, 'Customer'),
      COALESCE(v_user_name, 'Customer') || ' (' || v_user_phone || ') requested a visit for ' || COALESCE(v_property_title, 'your property') || ' on ' || to_char(p_scheduled_at, 'DD Mon, HH:MI AM') || '.',
      '/agent/leads?leadId=' || v_lead_id::text
    );
  END IF;

  -- Notify Builder if applicable
  IF v_builder_id IS NOT NULL AND v_builder_id <> COALESCE(v_agent_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    PERFORM public.notify_user(
      v_builder_id,
      'appointment',
      'Site Visit Requested for ' || COALESCE(v_property_title, 'Listing'),
      COALESCE(v_user_name, 'Customer') || ' scheduled a site visit for ' || to_char(p_scheduled_at, 'DD Mon, HH:MI AM') || '.',
      '/builder/appointments'
    );
  END IF;

  -- Notify Customer
  IF v_customer_id IS NOT NULL THEN
    PERFORM public.notify_user(
      v_customer_id,
      'appointment',
      'Visit Request Submitted',
      'Your visit request for ' || COALESCE(v_property_title, 'the property') || ' on ' || to_char(p_scheduled_at, 'DD Mon, HH:MI AM') || ' is submitted.',
      '/portal/appointments'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'lead_id', v_lead_id,
    'agent_id', v_agent_id,
    'builder_id', v_builder_id,
    'message', 'Visit request submitted successfully'
  );
END;
$$;

-- ============================================================
-- 6. BACKFILL & REALTIME PUBLICATION
-- ============================================================
-- Backfill builder_id on enquiries and appointments
UPDATE public.enquiries e
SET builder_id = p.owner_id
FROM public.properties p
JOIN public.profiles pr ON pr.id = p.owner_id AND pr.role = 'builder'
WHERE e.property_id = p.id AND e.builder_id IS NULL;

UPDATE public.appointments a
SET builder_id = p.owner_id
FROM public.properties p
JOIN public.profiles pr ON pr.id = p.owner_id AND pr.role = 'builder'
WHERE a.property_id = p.id AND a.builder_id IS NULL;

-- Enable Realtime
ALTER TABLE public.enquiries REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.agent_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.lead_activities REPLICA IDENTITY FULL;
ALTER TABLE public.property_assignments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.property_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
