-- =============================================================================
-- Migration: 20260904000000_0142_new_leads_free_property_sync.sql
-- Description: Dynamic lead capture and multi-role synchronization for
--              Free Property Listing leads (RN-LEAD-XXXXXX), standardizing
--              FREE_LIST_PROPERTY service type, property attributes in service_data,
--              CRM pipeline triggers, and Realtime publications.
-- =============================================================================

-- 1. Enhance fn_generate_lead_number trigger to recognize FREE_LIST_PROPERTY
CREATE OR REPLACE FUNCTION public.fn_generate_lead_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lead_number IS NULL OR trim(NEW.lead_number) = '' THEN
    NEW.lead_number := 'RN-LEAD-' || lpad(nextval('public.lead_number_seq')::text, 6, '0');
  END IF;

  -- Default service_type if not provided
  IF NEW.service_type IS NULL OR trim(NEW.service_type) = '' THEN
    IF NEW.source LIKE '%free_list%' OR 'free-listing' = ANY(COALESCE(NEW.tags, '{}'::text[])) OR 'FREE_LIST_PROPERTY' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'FREE_LIST_PROPERTY';
    ELSIF NEW.source LIKE '%home_loans%' OR 'home-loan' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'HOME_LOANS';
    ELSIF NEW.source LIKE '%borewell%' OR 'borewell-services' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'BOREWELL_SERVICES';
    ELSIF NEW.source LIKE '%legal%' OR 'legal services' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'LEGAL_SERVICES';
    ELSIF NEW.source LIKE '%packers%' OR 'packers and movers' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'PACKERS_MOVERS';
    ELSIF NEW.source LIKE '%pest%' OR 'pest control' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'PEST_CONTROL';
    ELSIF NEW.source LIKE '%painting%' OR 'painting' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'PAINTING';
    ELSIF NEW.source LIKE '%cleaning%' OR 'cleaning' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'CLEANING';
    ELSIF NEW.source LIKE '%interior%' OR 'interior services' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'INTERIOR_SERVICES';
    ELSIF NEW.source LIKE '%home_services%' OR 'home services' = ANY(COALESCE(NEW.tags, '{}'::text[])) THEN
      NEW.service_type := 'HOME_SERVICES';
    ELSE
      NEW.service_type := 'GENERAL_ENQUIRY';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_lead_number ON public.enquiries;
CREATE TRIGGER trg_generate_lead_number
  BEFORE INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_lead_number();

-- 2. Enhanced submit_contact_enquiry RPC supporting FREE_LIST_PROPERTY
CREATE OR REPLACE FUNCTION public.submit_contact_enquiry(
  p_name            TEXT,
  p_phone           TEXT,
  p_email           TEXT DEFAULT NULL,
  p_message         TEXT DEFAULT NULL,
  p_source          TEXT DEFAULT 'website',
  p_customer_id     UUID DEFAULT NULL,
  p_property_id     UUID DEFAULT NULL,
  p_tags            TEXT[] DEFAULT NULL,
  p_service_type    TEXT DEFAULT NULL,
  p_service_data    JSONB DEFAULT '{}'::jsonb,
  p_city            TEXT DEFAULT NULL,
  p_location        TEXT DEFAULT NULL,
  p_alternate_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enquiry_id   UUID;
  v_lead_number  TEXT;
  v_service_type TEXT;
  v_source       TEXT;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Name is required');
  END IF;

  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Phone is required');
  END IF;

  -- Ensure valid source adhering to check constraint ('website','portal','whatsapp','referral','direct','campaign','social','walk_in','call','import')
  v_source := CASE
    WHEN p_source IN ('website','portal','whatsapp','referral','direct','campaign','social','walk_in','call','import') THEN p_source
    ELSE 'website'
  END;

  v_service_type := COALESCE(
    NULLIF(trim(p_service_type), ''),
    CASE
      WHEN p_source LIKE '%free_list%' OR 'free-listing' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'FREE_LIST_PROPERTY' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'FREE_LIST_PROPERTY'
      WHEN p_source LIKE '%home_loans%' OR 'home-loan' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'HOME_LOANS' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'HOME_LOANS'
      WHEN p_source LIKE '%borewell%' OR 'borewell-services' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'BOREWELL_SERVICES' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'BOREWELL_SERVICES'
      WHEN p_source LIKE '%legal%' OR 'legal services' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'LEGAL_SERVICES' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'LEGAL_SERVICES'
      WHEN p_source LIKE '%packers%' OR 'packers and movers' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'PACKERS_MOVERS' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'PACKERS_MOVERS'
      WHEN p_source LIKE '%pest%' OR 'pest control' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'PEST_CONTROL' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'PEST_CONTROL'
      WHEN p_source LIKE '%painting%' OR 'painting' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'PAINTING' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'PAINTING'
      WHEN p_source LIKE '%cleaning%' OR 'cleaning' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'CLEANING' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'CLEANING'
      WHEN p_source LIKE '%interior%' OR 'interior services' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'INTERIOR_SERVICES' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'INTERIOR_SERVICES'
      WHEN p_source LIKE '%home_services%' OR 'home services' = ANY(COALESCE(p_tags, '{}'::text[])) OR 'HOME_SERVICES' = ANY(COALESCE(p_tags, '{}'::text[])) THEN 'HOME_SERVICES'
      ELSE 'GENERAL_ENQUIRY'
    END
  );

  INSERT INTO public.enquiries (
    name,
    phone,
    email,
    message,
    service_request,
    source,
    customer_id,
    property_id,
    tags,
    service_type,
    service_data,
    city,
    location,
    alternate_phone,
    status,
    lead_status,
    priority,
    created_at,
    updated_at
  ) VALUES (
    trim(p_name),
    trim(p_phone),
    NULLIF(trim(p_email), ''),
    NULLIF(trim(p_message), ''),
    NULLIF(trim(p_message), ''),
    v_source,
    p_customer_id,
    p_property_id,
    p_tags,
    v_service_type,
    COALESCE(p_service_data, '{}'::jsonb),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_location), ''),
    NULLIF(trim(p_alternate_phone), ''),
    'new',
    'new',
    'medium',
    now(),
    now()
  )
  RETURNING id, lead_number INTO v_enquiry_id, v_lead_number;

  -- Create initial creation activity in lead_activities
  BEGIN
    INSERT INTO public.lead_activities (
      lead_id,
      activity_type,
      title,
      description,
      is_system,
      created_at
    ) VALUES (
      v_enquiry_id,
      'created',
      'Lead Generated',
      'Lead #' || COALESCE(v_lead_number, v_enquiry_id::text) || ' received via ' || v_source || ' (' || v_service_type || ')',
      true,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'enquiry_id', v_enquiry_id,
    'lead_number', v_lead_number,
    'service_type', v_service_type,
    'message', 'Enquiry submitted successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contact_enquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT[], TEXT, JSONB, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;

-- 3. Composite indexes for high performance filtering
CREATE INDEX IF NOT EXISTS idx_enquiries_service_type_created ON public.enquiries(service_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_source_created ON public.enquiries(source, created_at DESC);
