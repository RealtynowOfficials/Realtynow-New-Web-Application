-- Migration: 20260814150000_0103_live_property_discovery_and_search_fix.sql
-- Description: Fix public live property discovery, search index & view, RLS policies, category mapping, and atomic publishing

-- 1. Ensure columns exist on properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Indexes for fast status, category, and location filtering
CREATE INDEX IF NOT EXISTS idx_properties_is_live ON public.properties(is_live);
CREATE INDEX IF NOT EXISTS idx_properties_approval_status ON public.properties(approval_status);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_status_live ON public.properties(status, is_live);

-- 3. Canonical Row-Level Security (RLS) Policy on public.properties
-- Ensures that ANY property marked 'published', 'live', or with is_live=true is publicly selectable
DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "properties_select_public_or_own" ON public.properties;
DROP POLICY IF EXISTS "properties_select_clean" ON public.properties;
DROP POLICY IF EXISTS "anon_select_published" ON public.properties;
DROP POLICY IF EXISTS "owner_select_properties" ON public.properties;

CREATE POLICY "properties_select" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (
    (
      (status IN ('published', 'live') OR is_live = true)
      AND (is_active IS NULL OR is_active = true)
      AND (deleted_at IS NULL)
    )
    OR auth.uid() = owner_id
    OR auth.uid() = assigned_agent_id
    OR public.is_staff()
  );

-- 4. Recreate public.v_properties_search view with full category & rich multi-keyword search text
DROP VIEW IF EXISTS public.v_saved_properties;
DROP VIEW IF EXISTS public.v_properties_search;

CREATE OR REPLACE VIEW public.v_properties_search WITH (security_invoker = true) AS
SELECT 
  p.*,
  c.name AS city_name,
  l.name AS locality_name,
  pt.name AS property_type_name,
  pt.category AS property_type_category,
  b.name AS builder_name,
  pr.name AS project_name,
  (
    COALESCE(p.title, '') || ' ' || 
    COALESCE(p.description, '') || ' ' || 
    COALESCE(p.address, '') || ' ' || 
    COALESCE(p.pincode, '') || ' ' ||
    COALESCE(c.name, '') || ' ' || 
    COALESCE(l.name, '') || ' ' || 
    COALESCE(pt.name, '') || ' ' || 
    COALESCE(pt.category, '') || ' ' || 
    COALESCE(b.name, '') || ' ' || 
    COALESCE(pr.name, '') || ' ' || 
    COALESCE(prof_agent.first_name, '') || ' ' || COALESCE(prof_agent.last_name, '') || ' ' || 
    COALESCE(prof_owner.first_name, '') || ' ' || COALESCE(prof_owner.last_name, '') || ' ' ||
    COALESCE(p.state, '') || ' ' ||
    COALESCE(p.country, '') || ' ' ||
    COALESCE(p.facing, '') || ' ' ||
    COALESCE(p.furnishing, '') || ' ' ||
    COALESCE(p.possession_status, '') || ' ' ||
    COALESCE(p.verified_status, '') || ' ' ||
    COALESCE(p.verification_status, '') || ' ' ||
    CASE 
      WHEN p.bedrooms IS NOT NULL THEN 
        p.bedrooms::text || ' BHK ' || p.bedrooms::text || 'BHK ' || p.bedrooms::text || ' bedroom ' || p.bedrooms::text || ' bed '
      ELSE ''
    END ||
    CASE 
      WHEN p.bathrooms IS NOT NULL THEN 
        p.bathrooms::text || ' Bath ' || p.bathrooms::text || ' Bathroom '
      ELSE ''
    END ||
    CASE 
      WHEN p.amenities IS NOT NULL AND array_length(p.amenities, 1) > 0 THEN 
        array_to_string(p.amenities, ' ') || ' '
      ELSE ''
    END ||
    CASE 
      WHEN p.price > 0 THEN 
        CASE 
          WHEN p.price >= 10000000 THEN 
            ROUND(p.price / 10000000.0, 2)::text || ' Cr ' || ROUND(p.price / 10000000.0, 2)::text || ' Crore ' || ROUND(p.price / 10000000.0, 2)::text || 'Cr ' || p.price::text || ' '
          WHEN p.price >= 100000 THEN 
            ROUND(p.price / 100000.0, 2)::text || ' Lakh ' || ROUND(p.price / 100000.0, 2)::text || ' Lakhs ' || ROUND(p.price / 100000.0, 2)::text || 'L ' || ROUND(p.price / 100000.0, 2)::text || 'Lac ' || p.price::text || ' '
          ELSE 
            p.price::text || ' '
        END
      ELSE ''
    END ||
    CASE
      WHEN p.purpose = 'Rent' AND p.rent_amount > 0 THEN
        p.rent_amount::text || ' rent '
      ELSE ''
    END ||
    CASE
      WHEN p.plot_details IS NOT NULL THEN
        COALESCE(p.plot_details->>'layout_name', '') || ' ' ||
        COALESCE(p.plot_details->>'approval_authority', '') || ' ' ||
        COALESCE(p.plot_details->>'zoning_type', '') || ' '
      ELSE ''
    END
  ) AS search_text
FROM public.properties p
LEFT JOIN public.cities c ON p.city_id = c.id
LEFT JOIN public.localities l ON p.locality_id = l.id
LEFT JOIN public.property_types pt ON p.property_type_id = pt.id
LEFT JOIN public.builders b ON p.builder_id = b.id
LEFT JOIN public.projects pr ON p.project_id = pr.id
LEFT JOIN public.profiles prof_agent ON p.assigned_agent_id = prof_agent.id
LEFT JOIN public.profiles prof_owner ON p.owner_id = prof_owner.id;

GRANT SELECT ON public.v_properties_search TO authenticated, anon;

-- Recreate v_saved_properties view if it existed
CREATE OR REPLACE VIEW public.v_saved_properties AS
SELECT 
  f.id AS favorite_id,
  f.user_id,
  f.created_at AS saved_at,
  p.*
FROM public.favorites f
JOIN public.v_properties_search p ON p.id = f.property_id;

GRANT SELECT ON public.v_saved_properties TO authenticated;

-- 5. Stored Procedures for Atomic Admin Publishing ("Make Live" / "Approve")
CREATE OR REPLACE FUNCTION public.admin_make_property_live(
  p_property_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property public.properties%ROWTYPE;
  v_admin_id UUID;
BEGIN
  v_admin_id := COALESCE(p_admin_id, auth.uid());
  
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can publish properties to live.';
  END IF;

  SELECT * INTO v_property FROM public.properties WHERE id = p_property_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  -- Validate mandatory fields before publishing
  IF v_property.title IS NULL OR length(trim(v_property.title)) = 0 THEN
    RAISE EXCEPTION 'Cannot publish: Property title is missing.';
  END IF;
  IF v_property.price IS NULL OR v_property.price <= 0 THEN
    IF v_property.purpose = 'Rent' AND (v_property.rent_amount IS NULL OR v_property.rent_amount <= 0) THEN
      RAISE EXCEPTION 'Cannot publish: Property price or rent amount must be greater than 0.';
    END IF;
  END IF;

  -- Atomic update
  UPDATE public.properties
  SET
    status = 'published',
    approval_status = 'Approved',
    is_live = true,
    is_active = true,
    deleted_at = NULL,
    approved_by = v_admin_id,
    approved_at = now(),
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE id = p_property_id
  RETURNING * INTO v_property;

  -- Log into property_status_history for audit
  INSERT INTO public.property_status_history (
    property_id,
    status,
    changed_by,
    reason,
    created_at
  ) VALUES (
    p_property_id,
    'published',
    v_admin_id,
    'Published to Live by Admin',
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'status', 'published',
    'approval_status', 'Approved',
    'is_live', true,
    'published_at', v_property.published_at
  );
END;
$$;

-- Keep admin_approve_property synchronized
CREATE OR REPLACE FUNCTION public.admin_approve_property(
  p_property_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.admin_make_property_live(p_property_id, p_admin_id);
END;
$$;

-- 6. Synchronize any existing approved properties so they have is_live = true & status = 'published'
UPDATE public.properties
SET 
  status = 'published',
  is_live = true,
  approval_status = 'Approved',
  published_at = COALESCE(published_at, now()),
  updated_at = now()
WHERE (status = 'approved' OR approval_status = 'Approved' OR is_live = true)
  AND status NOT IN ('rejected', 'archived', 'draft');
