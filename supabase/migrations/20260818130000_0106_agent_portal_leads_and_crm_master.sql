-- =============================================================================
-- Migration: 20260818130000_0106_agent_portal_leads_and_crm_master.sql
-- Description: Master migration for Agent Portal lead capture, atomic assignment,
--              realtime synchronization, lead activity logging, and CRM workflow.
-- =============================================================================

-- 1. Ensure columns exist on public.enquiries with proper defaults and constraints
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS assigned_to        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS assigned_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_status        TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'property_contact_agent',
  ADD COLUMN IF NOT EXISTS priority           TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS follow_up_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_count      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure replica identity full on enquiries for Supabase Realtime
ALTER TABLE public.enquiries REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;


-- 2. CANONICAL CONTACT AGENT LEAD CREATION & ASSIGNMENT RPC
CREATE OR REPLACE FUNCTION public.submit_contact_lead(
  p_property_id UUID,
  p_agent_id    UUID DEFAULT NULL,
  p_name       TEXT DEFAULT NULL,
  p_phone      TEXT DEFAULT NULL,
  p_email      TEXT DEFAULT NULL,
  p_message    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_agent_id UUID;
  v_property_title    TEXT;
  v_property_owner_id UUID;
  v_lead_id           UUID;
  v_customer_id       UUID;
  v_existing_lead_id  UUID;
  v_recent_threshold  TIMESTAMPTZ;
BEGIN
  v_customer_id := auth.uid();
  v_recent_threshold := now() - INTERVAL '5 minutes';

  -- Resolve property information and default assigned agent
  SELECT title, assigned_agent_id, owner_id
  INTO v_property_title, v_assigned_agent_id, v_property_owner_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_property_title IS NULL THEN
    RAISE EXCEPTION 'Property not found.';
  END IF;

  -- Use provided agent_id if given, otherwise use property assigned_agent_id or owner_id
  IF p_agent_id IS NOT NULL THEN
    v_assigned_agent_id := p_agent_id;
  ELSIF v_assigned_agent_id IS NULL THEN
    v_assigned_agent_id := v_property_owner_id;
  END IF;

  -- Verify customer user exists in auth.users before setting customer_id FK
  IF v_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_customer_id) THEN
    v_customer_id := NULL;
  END IF;

  -- Duplicate Submission Protection:
  -- Check if an enquiry with the same phone and property was created in the last 5 minutes
  IF p_phone IS NOT NULL AND trim(p_phone) <> '' THEN
    SELECT id INTO v_existing_lead_id
    FROM public.enquiries
    WHERE property_id = p_property_id
      AND phone = trim(p_phone)
      AND created_at >= v_recent_threshold
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_existing_lead_id IS NOT NULL THEN
    -- Update existing lead with latest message and refresh updated_at
    UPDATE public.enquiries
    SET
      message = COALESCE(NULLIF(trim(p_message), ''), message),
      email = COALESCE(NULLIF(trim(p_email), ''), email),
      name = COALESCE(NULLIF(trim(p_name), ''), name),
      updated_at = now()
    WHERE id = v_existing_lead_id;

    -- Record duplicate activity note
    INSERT INTO public.lead_activities (
      lead_id,
      actor_id,
      activity_type,
      title,
      description,
      is_system,
      created_at
    ) VALUES (
      v_existing_lead_id,
      v_assigned_agent_id,
      'note_added',
      'Follow-up Enquiry Received',
      'Customer re-submitted Contact Agent form on ' || v_property_title,
      true,
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'lead_id', v_existing_lead_id,
      'agent_id', v_assigned_agent_id,
      'property_title', v_property_title,
      'is_duplicate', true
    );
  END IF;

  -- Insert new lead into enquiries
  INSERT INTO public.enquiries (
    property_id,
    agent_id,
    assigned_to,
    assigned_at,
    customer_id,
    name,
    phone,
    email,
    message,
    source,
    lead_status,
    status,
    priority,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    v_assigned_agent_id,
    v_assigned_agent_id,
    now(),
    v_customer_id,
    trim(p_name),
    trim(p_phone),
    NULLIF(trim(p_email), ''),
    NULLIF(trim(p_message), ''),
    'property_contact_agent',
    'new',
    'new',
    'medium',
    now(),
    now()
  )
  RETURNING id INTO v_lead_id;

  -- Create initial Lead Activity entry
  BEGIN
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
      v_assigned_agent_id,
      'created',
      'Lead Created',
      'New enquiry submitted via Contact Agent on ' || v_property_title,
      true,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Non-blocking
  END;

  -- Notify Assigned Agent
  IF v_assigned_agent_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_assigned_agent_id,
        'lead_assigned',
        'New Property Enquiry',
        COALESCE(p_name, 'A customer') || ' is interested in ' || v_property_title,
        '/agent/leads'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Non-blocking
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'agent_id', v_assigned_agent_id,
    'property_title', v_property_title,
    'is_duplicate', false
  );
END;
$$;


-- 3. RLS POLICIES FOR ENQUIRIES & CRM
DROP POLICY IF EXISTS "enquiries_select" ON public.enquiries;
CREATE POLICY "enquiries_select" ON public.enquiries
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = agent_id
    OR auth.uid() = assigned_to
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "enquiries_insert" ON public.enquiries;
CREATE POLICY "enquiries_insert" ON public.enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

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

-- Ensure RLS on lead_activities
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
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Ensure RLS on lead_notes
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

-- Ensure RLS on follow_up_scheduler
ALTER TABLE public.follow_up_scheduler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow_up_read" ON public.follow_up_scheduler;
CREATE POLICY "follow_up_read" ON public.follow_up_scheduler
  FOR SELECT TO authenticated
  USING (auth.uid() = scheduled_by OR auth.uid() = assigned_to OR public.is_staff());

DROP POLICY IF EXISTS "follow_up_write" ON public.follow_up_scheduler;
CREATE POLICY "follow_up_write" ON public.follow_up_scheduler
  FOR ALL TO authenticated
  USING (auth.uid() = scheduled_by OR auth.uid() = assigned_to OR public.is_staff())
  WITH CHECK (auth.uid() = scheduled_by OR auth.uid() = assigned_to OR public.is_staff());
