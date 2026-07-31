-- Migration: 20260722170000_0013_master_property_sync_enterprise.sql
-- Description: Master Customer -> Admin -> Live Property Synchronization schema, triggers, RPC procedures, and Realtime enablement.

-- 1. Add Workflow Columns to public.properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Constraint check for approval_status
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_approval_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_approval_status_check 
  CHECK (approval_status IN ('Pending','Under Review','Approved','Rejected','Changes Requested'));

-- Enable Replica Identity FULL for complete Supabase Realtime payload delivery
ALTER TABLE public.properties REPLICA IDENTITY FULL;

-- Update existing approved/published properties to have is_live = true
UPDATE public.properties
SET is_live = true, approval_status = 'Approved', status = 'published'
WHERE status IN ('published', 'approved') AND (is_live IS NULL OR is_live = false);

UPDATE public.properties
SET approval_status = 'Pending'
WHERE status IN ('submitted', 'pending_verification') AND (approval_status IS NULL);

UPDATE public.properties
SET approval_status = 'Rejected'
WHERE status = 'rejected' AND (approval_status IS NULL);

-- 2. Indexes for fast status & realtime queries
CREATE INDEX IF NOT EXISTS idx_properties_is_live ON public.properties(is_live);
CREATE INDEX IF NOT EXISTS idx_properties_approval_status ON public.properties(approval_status);

-- 3. Stored RPC Functions for Atomic Transactions

-- A. Admin Approve Property
CREATE OR REPLACE FUNCTION public.admin_approve_property(
  p_property_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property public.properties%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(p_admin_id, auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve properties.';
  END IF;

  UPDATE public.properties
  SET
    status = 'published',
    approval_status = 'Approved',
    is_live = true,
    approved_by = COALESCE(p_admin_id, auth.uid()),
    approved_at = now(),
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE id = p_property_id
  RETURNING * INTO v_property;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'property_id', p_property_id, 'status', 'published', 'is_live', true);
END;
$$;

-- B. Admin Reject Property
CREATE OR REPLACE FUNCTION public.admin_reject_property(
  p_property_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_reason TEXT DEFAULT 'Property submission rejected by admin.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property public.properties%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(p_admin_id, auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject properties.';
  END IF;

  UPDATE public.properties
  SET
    status = 'rejected',
    approval_status = 'Rejected',
    is_live = false,
    rejection_reason = p_reason,
    reviewed_by = COALESCE(p_admin_id, auth.uid()),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_property_id
  RETURNING * INTO v_property;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'property_id', p_property_id, 'status', 'rejected', 'is_live', false);
END;
$$;

-- C. Admin Assign Agent
CREATE OR REPLACE FUNCTION public.admin_assign_agent(
  p_property_id UUID,
  p_agent_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(p_admin_id, auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can assign agents.';
  END IF;

  UPDATE public.properties
  SET
    assigned_agent_id = p_agent_id,
    updated_at = now()
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  -- Notify assigned agent
  PERFORM public.notify_user(
    p_agent_id,
    'agent_assigned',
    'New property assigned',
    'You have been assigned to manage a property listing.',
    '/agent/properties'
  );

  RETURN jsonb_build_object('success', true, 'property_id', p_property_id, 'assigned_agent_id', p_agent_id);
END;
$$;

-- D. Customer Resubmit Property (After Rejection or Changes Requested)
CREATE OR REPLACE FUNCTION public.customer_resubmit_property(
  p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.properties WHERE id = p_property_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  IF v_owner_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property.';
  END IF;

  UPDATE public.properties
  SET
    status = 'submitted',
    approval_status = 'Pending',
    is_live = false,
    rejection_reason = NULL,
    updated_at = now()
  WHERE id = p_property_id;

  RETURN jsonb_build_object('success', true, 'property_id', p_property_id, 'status', 'submitted', 'approval_status', 'Pending');
END;
$$;

-- 4. Update Admin RPC helper to return full workflow fields
DROP FUNCTION IF EXISTS public.admin_get_properties();
CREATE OR REPLACE FUNCTION public.admin_get_properties()
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  property_type_id uuid,
  purpose text,
  city_id uuid,
  locality_id uuid,
  address text,
  latitude numeric,
  longitude numeric,
  price numeric,
  rent_amount numeric,
  security_deposit numeric,
  bedrooms int,
  bathrooms int,
  balconies int,
  floor_number int,
  total_floors int,
  built_up_area numeric,
  carpet_area numeric,
  facing text,
  furnishing text,
  parking int,
  amenities text[],
  features jsonb,
  images jsonb,
  videos jsonb,
  documents jsonb,
  status text,
  approval_status text,
  is_live boolean,
  is_featured boolean,
  is_luxury boolean,
  view_count int,
  ai_description text,
  ai_seo text,
  assigned_agent_id uuid,
  rejection_reason text,
  published_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  city_name text,
  locality_name text,
  property_type_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.property_type_id,
    p.purpose,
    p.city_id,
    p.locality_id,
    p.address,
    p.latitude,
    p.longitude,
    p.price,
    p.rent_amount,
    p.security_deposit,
    p.bedrooms,
    p.bathrooms,
    p.balconies,
    p.floor_number,
    p.total_floors,
    p.built_up_area,
    p.carpet_area,
    p.facing,
    p.furnishing,
    p.parking,
    p.amenities,
    p.features,
    p.images,
    p.videos,
    p.documents,
    p.status,
    p.approval_status,
    p.is_live,
    p.is_featured,
    p.is_luxury,
    p.view_count,
    p.ai_description,
    p.ai_seo,
    p.assigned_agent_id,
    p.rejection_reason,
    p.published_at,
    p.approved_at,
    p.created_at,
    p.updated_at,
    c.name as city_name,
    l.name as locality_name,
    pt.name as property_type_name
  FROM public.properties p
  LEFT JOIN public.cities c ON p.city_id = c.id
  LEFT JOIN public.localities l ON p.locality_id = l.id
  LEFT JOIN public.property_types pt ON p.property_type_id = pt.id;
$$;

-- 5. Enable Supabase Realtime Replication for Properties & Notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties, public.notifications, public.property_status_history, public.enquiries;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- 6. Update RLS Policies for Public & Customer Access
DROP POLICY IF EXISTS "anon_select_published" ON public.properties;
CREATE POLICY "anon_select_published" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR is_live = true);

-- Ensure owner has full read/update/delete for own properties
DROP POLICY IF EXISTS "owner_select_properties" ON public.properties;
CREATE POLICY "owner_select_properties" ON public.properties
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_update_properties" ON public.properties;
CREATE POLICY "owner_update_properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Ensure admin has full select/update/delete access
DROP POLICY IF EXISTS "admin_select_properties" ON public.properties;
CREATE POLICY "admin_select_properties" ON public.properties
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin_update_properties" ON public.properties;
CREATE POLICY "admin_update_properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
