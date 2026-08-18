-- =============================================================================
-- Migration: 20260818140000_0107_lead_capture_and_notification_deep_link.sql
-- Description: Unifies customer enquiry/visit/appointment submissions into atomic
--              CRM Leads, links appointments to leads, and wires notification
--              deep-links (/agent/leads?leadId=...) with customer details.
-- =============================================================================

-- 1. Ensure lead_id column exists on public.appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_date DATE,
  ADD COLUMN IF NOT EXISTS time_slot TEXT,
  ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'Property Visit',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'book_a_visit',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure replica identity full on appointments for Realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;


-- 2. CANONICAL SUBMIT VISIT REQUEST RPC (CREATES/UPDATES LEAD + APPOINTMENT + NOTIFICATION)
CREATE OR REPLACE FUNCTION public.submit_visit_request(
  p_property_id    UUID,
  p_agent_id       UUID DEFAULT NULL,
  p_name          TEXT DEFAULT NULL,
  p_phone         TEXT DEFAULT NULL,
  p_email         TEXT DEFAULT NULL,
  p_preferred_date DATE DEFAULT NULL,
  p_time_slot     TEXT DEFAULT NULL,
  p_visit_type    TEXT DEFAULT 'Property Visit',
  p_message       TEXT DEFAULT NULL
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
  v_customer_id       UUID;
  v_scheduled_time    TIMESTAMPTZ;
  v_visit_id          UUID;
  v_lead_id           UUID;
  v_existing_lead_id  UUID;
  v_recent_threshold  TIMESTAMPTZ;
  v_clean_phone       TEXT;
  v_clean_name        TEXT;
BEGIN
  v_customer_id := auth.uid();
  v_recent_threshold := now() - INTERVAL '24 hours';
  v_clean_phone := trim(COALESCE(p_phone, ''));
  v_clean_name := trim(COALESCE(p_name, 'Customer'));

  -- Resolve property title, assigned agent, owner
  SELECT title, assigned_agent_id, owner_id
  INTO v_property_title, v_assigned_agent_id, v_property_owner_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_property_title IS NULL THEN
    RAISE EXCEPTION 'Property not found.';
  END IF;

  -- Use provided agent_id if given, otherwise fallback to property assigned agent or owner
  IF p_agent_id IS NOT NULL THEN
    v_assigned_agent_id := p_agent_id;
  ELSIF v_assigned_agent_id IS NULL THEN
    v_assigned_agent_id := v_property_owner_id;
  END IF;

  -- Validate foreign key existence to prevent constraint violations
  IF v_assigned_agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_assigned_agent_id) THEN
    v_assigned_agent_id := NULL;
  END IF;

  IF v_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_customer_id) THEN
    v_customer_id := NULL;
  END IF;

  -- Build scheduled_at timestamptz fallback from preferred_date
  v_scheduled_time := COALESCE(
    (p_preferred_date::text || ' ' || COALESCE(NULLIF(p_time_slot, ''), '10:00 AM'))::timestamptz,
    now() + interval '1 day'
  );

  -- ── STEP 1: Find or Create the CRM Lead ────────────────────────────────────
  IF v_clean_phone <> '' THEN
    SELECT id INTO v_existing_lead_id
    FROM public.enquiries
    WHERE property_id = p_property_id
      AND phone = v_clean_phone
      AND created_at >= v_recent_threshold
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_existing_lead_id IS NOT NULL THEN
    v_lead_id := v_existing_lead_id;
    UPDATE public.enquiries
    SET
      lead_status = 'site_visit',
      name = COALESCE(NULLIF(v_clean_name, ''), name),
      email = COALESCE(NULLIF(trim(p_email), ''), email),
      follow_up_at = v_scheduled_time,
      updated_at = now()
    WHERE id = v_lead_id;
  ELSE
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
      follow_up_at,
      created_at,
      updated_at
    ) VALUES (
      p_property_id,
      v_assigned_agent_id,
      v_assigned_agent_id,
      now(),
      v_customer_id,
      v_clean_name,
      v_clean_phone,
      NULLIF(trim(p_email), ''),
      COALESCE(NULLIF(trim(p_message), ''), 'Requested ' || COALESCE(p_visit_type, 'visit') || ' on ' || COALESCE(p_preferred_date::text, 'preferred date') || ' at ' || COALESCE(p_time_slot, 'slot')),
      'site_visit',
      'site_visit',
      'contacted',
      'high',
      v_scheduled_time,
      now(),
      now()
    )
    RETURNING id INTO v_lead_id;
  END IF;

  -- ── STEP 2: Create Appointment Record Linked to Lead ───────────────────────
  INSERT INTO public.appointments (
    lead_id,
    property_id,
    agent_id,
    customer_id,
    name,
    phone,
    email,
    preferred_date,
    time_slot,
    visit_type,
    scheduled_at,
    notes,
    status,
    source,
    created_at,
    updated_at
  ) VALUES (
    v_lead_id,
    p_property_id,
    v_assigned_agent_id,
    v_customer_id,
    v_clean_name,
    v_clean_phone,
    NULLIF(trim(p_email), ''),
    p_preferred_date,
    p_time_slot,
    COALESCE(p_visit_type, 'Property Visit'),
    v_scheduled_time,
    p_message,
    'requested',
    'book_a_visit',
    now(),
    now()
  )
  RETURNING id INTO v_visit_id;

  -- ── STEP 3: Record Lead Activity ──────────────────────────────────────────
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
      'site_visit',
      'Site Visit Requested',
      v_clean_name || ' requested ' || COALESCE(p_visit_type, 'a visit') || ' for ' || COALESCE(p_preferred_date::text, '') || ' (' || COALESCE(p_time_slot, '') || ')',
      true,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- ── STEP 4: Notify Customer (if logged in) ────────────────────────────────
  IF v_customer_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_customer_id,
        'visit_requested',
        'Visit Request Submitted',
        'Your visit request for ' || v_property_title || ' on ' || COALESCE(p_preferred_date::text, 'scheduled date') || ' has been submitted.',
        '/portal/appointments'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- ── STEP 5: Notify Assigned Agent with Deep Link to Lead CRM ──────────────
  IF v_assigned_agent_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_assigned_agent_id,
        'visit_requested',
        'New Site Visit Request',
        v_clean_name || ' (' || v_clean_phone || ') requested a ' || COALESCE(p_visit_type, 'visit') || ' for ' || v_property_title || ' on ' || COALESCE(p_preferred_date::text, '') || ' at ' || COALESCE(p_time_slot, ''),
        '/agent/leads?leadId=' || v_lead_id::text
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'lead_id', v_lead_id,
    'agent_id', v_assigned_agent_id,
    'property_title', v_property_title
  );
END;
$$;


-- 3. UPGRADE SUBMIT CONTACT LEAD RPC TO DISPATCH DEEP LINK TO LEAD CRM
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
  v_clean_phone       TEXT;
  v_clean_name        TEXT;
BEGIN
  v_customer_id := auth.uid();
  v_recent_threshold := now() - INTERVAL '5 minutes';
  v_clean_phone := trim(COALESCE(p_phone, ''));
  v_clean_name := trim(COALESCE(p_name, 'Customer'));

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

  -- Validate foreign key existence to prevent constraint violations
  IF v_assigned_agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_assigned_agent_id) THEN
    v_assigned_agent_id := NULL;
  END IF;

  IF v_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_customer_id) THEN
    v_customer_id := NULL;
  END IF;

  -- Duplicate Submission Protection (5-minute window for same phone and property)
  IF v_clean_phone <> '' THEN
    SELECT id INTO v_existing_lead_id
    FROM public.enquiries
    WHERE property_id = p_property_id
      AND phone = v_clean_phone
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
      name = COALESCE(NULLIF(v_clean_name, ''), name),
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
      v_clean_name || ' (' || v_clean_phone || ') re-submitted Contact Agent form on ' || v_property_title,
      true,
      now()
    );

    -- Send notification with deep link
    IF v_assigned_agent_id IS NOT NULL THEN
      BEGIN
        PERFORM public.notify_user(
          v_assigned_agent_id,
          'lead_assigned',
          'New Property Enquiry',
          v_clean_name || ' (' || v_clean_phone || ') is interested in ' || v_property_title,
          '/agent/leads?leadId=' || v_existing_lead_id::text
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

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
    v_clean_name,
    v_clean_phone,
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
    NULL;
  END;

  -- Notify Assigned Agent with deep link
  IF v_assigned_agent_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_assigned_agent_id,
        'lead_assigned',
        'New Property Enquiry',
        v_clean_name || ' (' || v_clean_phone || ') is interested in ' || v_property_title,
        '/agent/leads?leadId=' || v_lead_id::text
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
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


-- 4. BACKFILL: Link existing appointments to existing enquiries
DO $$
BEGIN
  UPDATE public.appointments a
  SET lead_id = e.id
  FROM public.enquiries e
  WHERE a.lead_id IS NULL
    AND a.property_id = e.property_id
    AND (
      (a.phone IS NOT NULL AND a.phone = e.phone)
      OR (a.customer_id IS NOT NULL AND a.customer_id = e.customer_id)
    );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
