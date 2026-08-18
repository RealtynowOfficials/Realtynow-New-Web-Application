-- =============================================================================
-- Migration: 20260814170000_0105_contact_agent_whatsapp_visits_master.sql
-- Description: Master backend schema updates for Contact Agent, WhatsApp sync,
--              and Book a Visit workflows with canonical lead/appointment RPCs and RLS.
-- =============================================================================

-- 1. AGENT PROFILE EXTENSIONS (Phone + WhatsApp synchronization)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number           TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number        TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_same_as_phone BOOLEAN NOT NULL DEFAULT false;

-- Trigger function to automatically keep whatsapp_number = phone_number when whatsapp_same_as_phone is true
CREATE OR REPLACE FUNCTION public.fn_sync_agent_whatsapp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Populate phone_number from legacy phone column if empty
  IF NEW.phone_number IS NULL OR NEW.phone_number = '' THEN
    NEW.phone_number := NEW.phone;
  END IF;

  -- Synchronize whatsapp_number when checkbox is checked
  IF NEW.whatsapp_same_as_phone = true THEN
    NEW.whatsapp_number := COALESCE(NEW.phone_number, NEW.phone);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agent_whatsapp ON public.profiles;
CREATE TRIGGER trg_sync_agent_whatsapp
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_agent_whatsapp();

-- Update existing agent profiles where whatsapp_number is missing
UPDATE public.profiles
SET whatsapp_number = COALESCE(phone_number, phone)
WHERE (whatsapp_number IS NULL OR whatsapp_number = '') AND (phone IS NOT NULL OR phone_number IS NOT NULL);


-- 2. ENQUIRIES TABLE ENHANCEMENTS (Leads)
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS name               TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS email              TEXT,
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'website';


-- 3. APPOINTMENTS TABLE ENHANCEMENTS (Site Visits)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS name               TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS email              TEXT,
  ADD COLUMN IF NOT EXISTS preferred_date     DATE,
  ADD COLUMN IF NOT EXISTS time_slot          TEXT,
  ADD COLUMN IF NOT EXISTS visit_type         TEXT NOT NULL DEFAULT 'Property Visit',
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'book_a_visit';

-- Ensure customer_id column allows NULL for guest submissions while capturing authenticated user when available
ALTER TABLE public.appointments
  ALTER COLUMN customer_id DROP NOT NULL;


-- 4. CANONICAL CONTACT AGENT LEAD CREATION RPC
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
AS $$
DECLARE
  v_assigned_agent_id UUID;
  v_property_title    TEXT;
  v_lead_id           UUID;
  v_customer_id       UUID;
BEGIN
  v_customer_id := auth.uid();

  -- Resolve property and assigned agent
  SELECT title, COALESCE(assigned_agent_id, owner_id)
  INTO v_property_title, v_assigned_agent_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_property_title IS NULL THEN
    RAISE EXCEPTION 'Property not found.';
  END IF;

  -- Use provided agent_id if valid, otherwise fallback to property assigned agent
  IF p_agent_id IS NOT NULL THEN
    v_assigned_agent_id := p_agent_id;
  END IF;

  -- Validate foreign key existence to prevent constraint violations
  IF v_assigned_agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_assigned_agent_id) THEN
    v_assigned_agent_id := NULL;
  END IF;

  IF v_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_customer_id) THEN
    v_customer_id := NULL;
  END IF;

  -- Create single canonical lead
  INSERT INTO public.enquiries (
    property_id,
    agent_id,
    assigned_to,
    customer_id,
    name,
    phone,
    email,
    message,
    source,
    lead_status,
    status
  ) VALUES (
    p_property_id,
    v_assigned_agent_id,
    v_assigned_agent_id,
    v_customer_id,
    p_name,
    p_phone,
    p_email,
    p_message,
    'contact_agent',
    'new',
    'new'
  )
  RETURNING id INTO v_lead_id;

  -- Notify Assigned Agent safely
  IF v_assigned_agent_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_assigned_agent_id,
        'lead_assigned',
        'New Property Enquiry',
        'New enquiry received for ' || v_property_title,
        '/agent/leads'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Guarantee lead creation even if notification dispatch fails
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'agent_id', v_assigned_agent_id,
    'property_title', v_property_title
  );
END;
$$;


-- 5. CANONICAL BOOK A VISIT REQUEST RPC
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
AS $$
DECLARE
  v_assigned_agent_id UUID;
  v_property_title    TEXT;
  v_visit_id          UUID;
  v_customer_id       UUID;
  v_scheduled_time    TIMESTAMPTZ;
BEGIN
  v_customer_id := auth.uid();

  -- Resolve property and assigned agent
  SELECT title, COALESCE(assigned_agent_id, owner_id)
  INTO v_property_title, v_assigned_agent_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_property_title IS NULL THEN
    RAISE EXCEPTION 'Property not found.';
  END IF;

  IF p_agent_id IS NOT NULL THEN
    v_assigned_agent_id := p_agent_id;
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

  -- Create single visit request record
  INSERT INTO public.appointments (
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
    source
  ) VALUES (
    p_property_id,
    v_assigned_agent_id,
    v_customer_id,
    p_name,
    p_phone,
    p_email,
    p_preferred_date,
    p_time_slot,
    COALESCE(p_visit_type, 'Property Visit'),
    v_scheduled_time,
    p_message,
    'requested',
    'book_a_visit'
  )
  RETURNING id INTO v_visit_id;

  -- Notify Customer if logged in
  IF v_customer_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_customer_id,
        'visit_requested',
        'Visit Request Submitted',
        'Your visit request for ' || v_property_title || ' has been submitted.',
        '/portal/appointments'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Notify Assigned Agent
  IF v_assigned_agent_id IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_user(
        v_assigned_agent_id,
        'visit_requested',
        'New Site Visit Request',
        'New ' || COALESCE(p_visit_type, 'site visit') || ' request for ' || v_property_title,
        '/agent/appointments'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'agent_id', v_assigned_agent_id,
    'property_title', v_property_title
  );
END;
$$;


-- 6. RLS POLICIES FOR ENQUIRIES & APPOINTMENTS
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Enquiries RLS
DROP POLICY IF EXISTS "enquiries_public_insert" ON public.enquiries;
CREATE POLICY "enquiries_public_insert" ON public.enquiries
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "enquiries_agent_select" ON public.enquiries;
CREATE POLICY "enquiries_agent_select" ON public.enquiries
  FOR SELECT TO authenticated USING (
    agent_id = auth.uid() OR
    assigned_to = auth.uid() OR
    customer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "enquiries_agent_update" ON public.enquiries;
CREATE POLICY "enquiries_agent_update" ON public.enquiries
  FOR UPDATE TO authenticated USING (
    agent_id = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Appointments RLS
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;
CREATE POLICY "appointments_public_insert" ON public.appointments
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_agent_select" ON public.appointments;
CREATE POLICY "appointments_agent_select" ON public.appointments
  FOR SELECT TO authenticated USING (
    agent_id = auth.uid() OR
    customer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "appointments_agent_update" ON public.appointments;
CREATE POLICY "appointments_agent_update" ON public.appointments
  FOR UPDATE TO authenticated USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
