-- 0070: Dynamic Property Listing Workflow Engine (Phase 1)
--
-- Adds a config-driven listing engine that coexists with the existing
-- hardcoded wizard at src/pages/portal/list-property.tsx. Only 4 new
-- tables: 3 hold workflow *configuration* (listing_purposes/workflow_steps/
-- workflow_fields), 1 holds in-progress draft *state* (listing_drafts).
-- Publish maps a draft's answers into a normal `properties` row, so the
-- existing admin approval pipeline, v_properties_search, and
-- my-properties.tsx all keep working completely unmodified.
--
-- properties.purpose already accepts all 7 target purposes (see
-- properties_purpose_check, last widened in migration 0030) — no change
-- needed there.

-- ── 1. listing_purposes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_purposes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  properties_purpose_value TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. workflow_steps ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose_id UUID NOT NULL REFERENCES public.listing_purposes(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purpose_id, step_key)
);

-- ── 3. workflow_fields ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN
    ('text','number','select','multiselect','checklist','textarea','file','location','boolean','date','date_range')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  placeholder TEXT,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  maps_to TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (step_id, field_key)
);

-- ── 4. listing_drafts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose_id UUID NOT NULL REFERENCES public.listing_purposes(id),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted')),
  published_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_drafts_owner ON public.listing_drafts(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_purpose ON public.workflow_steps(purpose_id);
CREATE INDEX IF NOT EXISTS idx_workflow_fields_step ON public.workflow_fields(step_id);

-- ── updated_at triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_dynamic_engine_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_listing_purposes_updated_at ON public.listing_purposes;
CREATE TRIGGER trg_listing_purposes_updated_at BEFORE UPDATE ON public.listing_purposes
  FOR EACH ROW EXECUTE FUNCTION public.handle_dynamic_engine_updated_at();

DROP TRIGGER IF EXISTS trg_workflow_steps_updated_at ON public.workflow_steps;
CREATE TRIGGER trg_workflow_steps_updated_at BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_dynamic_engine_updated_at();

DROP TRIGGER IF EXISTS trg_workflow_fields_updated_at ON public.workflow_fields;
CREATE TRIGGER trg_workflow_fields_updated_at BEFORE UPDATE ON public.workflow_fields
  FOR EACH ROW EXECUTE FUNCTION public.handle_dynamic_engine_updated_at();

DROP TRIGGER IF EXISTS trg_listing_drafts_updated_at ON public.listing_drafts;
CREATE TRIGGER trg_listing_drafts_updated_at BEFORE UPDATE ON public.listing_drafts
  FOR EACH ROW EXECUTE FUNCTION public.handle_dynamic_engine_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.listing_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_fields  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_drafts   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_purposes_read" ON public.listing_purposes;
CREATE POLICY "listing_purposes_read" ON public.listing_purposes
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff());
DROP POLICY IF EXISTS "listing_purposes_admin_write" ON public.listing_purposes;
CREATE POLICY "listing_purposes_admin_write" ON public.listing_purposes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "workflow_steps_read" ON public.workflow_steps;
CREATE POLICY "workflow_steps_read" ON public.workflow_steps
  FOR SELECT TO anon, authenticated USING (
    is_active OR public.is_staff()
  );
DROP POLICY IF EXISTS "workflow_steps_admin_write" ON public.workflow_steps;
CREATE POLICY "workflow_steps_admin_write" ON public.workflow_steps
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "workflow_fields_read" ON public.workflow_fields;
CREATE POLICY "workflow_fields_read" ON public.workflow_fields
  FOR SELECT TO anon, authenticated USING (
    is_active OR public.is_staff()
  );
DROP POLICY IF EXISTS "workflow_fields_admin_write" ON public.workflow_fields;
CREATE POLICY "workflow_fields_admin_write" ON public.workflow_fields
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "listing_drafts_owner_rw" ON public.listing_drafts;
CREATE POLICY "listing_drafts_owner_rw" ON public.listing_drafts
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.is_staff())
  WITH CHECK (auth.uid() = owner_id OR public.is_staff());

GRANT SELECT ON public.listing_purposes, public.workflow_steps, public.workflow_fields TO anon, authenticated;
GRANT ALL ON public.listing_purposes, public.workflow_steps, public.workflow_fields TO authenticated;
GRANT ALL ON public.listing_drafts TO authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_drafts; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_fields; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ── Seed: all 7 purposes (only sale/rent active in Phase 1) ─────────
INSERT INTO public.listing_purposes (key, properties_purpose_value, label, icon, is_active, sort_order) VALUES
  ('sale', 'Sale', 'Sell a Property', 'Home', true, 1),
  ('rent', 'Rent', 'Rent Out a Property', 'Key', true, 2),
  ('lease', 'Lease', 'Lease (Commercial)', 'Briefcase', false, 3),
  ('pg', 'PG', 'PG / Paying Guest', 'Users', false, 4),
  ('coliving', 'CoLiving', 'Co-Living', 'Users2', false, 5),
  ('hostel', 'Hostel', 'Hostel', 'Building', false, 6),
  ('vacation_rental', 'Vacation Rental', 'Vacation Rental', 'Palmtree', false, 7)
ON CONFLICT (key) DO NOTHING;

-- ── Seed: Sale workflow (steps + fields) ────────────────────────────
DO $$
DECLARE
  v_purpose_id UUID;
  v_step_id UUID;
BEGIN
  SELECT id INTO v_purpose_id FROM public.listing_purposes WHERE key = 'sale';

  -- basic_details
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'basic_details', 'Basic Details', 'FileText', 1)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, options, placeholder, is_required, validation, maps_to, sort_order) VALUES
    (v_step_id, 'title', 'Listing Title', 'text', '[]', 'e.g. Spacious 3BHK in Jubilee Hills', true, '{"minLength":10,"maxLength":120}', 'properties.title', 1),
    (v_step_id, 'description', 'Description', 'textarea', '[]', 'Describe the property...', true, '{"minLength":30,"maxLength":2000}', 'properties.description', 2),
    (v_step_id, 'property_type_id', 'Property Type', 'select', '[]', NULL, true, '{}', 'properties.property_type_id', 3),
    (v_step_id, 'bedrooms', 'Bedrooms (BHK)', 'number', '[]', NULL, true, '{"min":0,"max":20}', 'properties.bedrooms', 4),
    (v_step_id, 'bathrooms', 'Bathrooms', 'number', '[]', NULL, false, '{"min":0,"max":20}', 'properties.bathrooms', 5),
    (v_step_id, 'balconies', 'Balconies', 'number', '[]', NULL, false, '{"min":0,"max":10}', 'properties.balconies', 6),
    (v_step_id, 'built_up_area', 'Built-up Area (sqft)', 'number', '[]', NULL, true, '{"min":1}', 'properties.built_up_area', 7),
    (v_step_id, 'carpet_area', 'Carpet Area (sqft)', 'number', '[]', NULL, false, '{"min":1}', 'properties.carpet_area', 8),
    (v_step_id, 'floor_number', 'Floor Number', 'number', '[]', NULL, false, '{}', 'properties.floor_number', 9),
    (v_step_id, 'total_floors', 'Total Floors', 'number', '[]', NULL, false, '{}', 'properties.total_floors', 10),
    (v_step_id, 'facing', 'Facing', 'select', '["North","South","East","West","North-East","North-West","South-East","South-West"]', NULL, false, '{}', 'properties.facing', 11),
    (v_step_id, 'furnishing', 'Furnishing', 'select', '["Unfurnished","Semi-Furnished","Fully Furnished"]', NULL, false, '{}', 'properties.furnishing', 12),
    (v_step_id, 'age_of_property', 'Age of Property (years)', 'number', '[]', NULL, false, '{"min":0}', 'properties.age_of_property', 13),
    (v_step_id, 'parking', 'Parking Slots', 'number', '[]', NULL, false, '{"min":0}', 'properties.parking', 14),
    (v_step_id, 'ownership_type', 'Owner Type', 'select', '["Individual","Builder","Agent","Power of Attorney"]', NULL, true, '{}', 'properties.ownership_type', 15)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- location
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'location', 'Location', 'MapPin', 2)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, is_required, maps_to, sort_order) VALUES
    (v_step_id, 'location', 'Property Location', 'location', true, 'properties.location', 1)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- pricing
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'pricing', 'Pricing', 'IndianRupee', 3)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, is_required, validation, maps_to, sort_order) VALUES
    (v_step_id, 'price', 'Expected Price (₹)', 'number', true, '{"min":1}', 'properties.price', 1),
    (v_step_id, 'is_negotiable', 'Price Negotiable', 'boolean', false, '{}', 'features.is_negotiable', 2),
    (v_step_id, 'booking_amount', 'Booking Amount (₹)', 'number', false, '{"min":0}', 'features.booking_amount', 3),
    (v_step_id, 'maintenance', 'Monthly Maintenance (₹)', 'number', false, '{"min":0}', 'features.maintenance', 4),
    (v_step_id, 'legal_approved', 'Legally Approved', 'boolean', false, '{}', 'properties.legal_approved', 5)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- amenities
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'amenities', 'Amenities', 'Sparkles', 4)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, options, is_required, maps_to, sort_order) VALUES
    (v_step_id, 'amenities', 'Amenities', 'checklist',
      '["Lift","Power Backup","24x7 Security","Gymnasium","Swimming Pool","Club House","Children''s Play Area","Park","CCTV Surveillance","Intercom","Piped Gas","Rain Water Harvesting","Vaastu Compliant","Servant Room","Study Room","Pooja Room","Modular Kitchen","Water Storage"]',
      false, 'properties.amenities', 1)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- media
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'media', 'Photos & Documents', 'Image', 5)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, is_required, help_text, validation, maps_to, sort_order) VALUES
    (v_step_id, 'images', 'Photos', 'file', true, 'Upload up to 15 photos, cover photo first', '{"accept":"image/*","multiple":true,"maxFiles":15}', 'properties.images', 1),
    (v_step_id, 'videos', 'Videos', 'file', false, 'Optional walkthrough video(s)', '{"accept":"video/*","multiple":true,"maxFiles":2}', 'properties.videos', 2),
    (v_step_id, 'documents', 'Legal Documents', 'file', false, 'Sale Deed, EC, Khata, RERA, Tax Receipt, Approved Layout', '{"accept":"application/pdf","multiple":true,"maxFiles":8}', 'properties.documents', 3)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- ai_content (bespoke step component, no generic fields)
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'ai_content', 'AI Assist', 'Sparkles', 6)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label;

  -- review (bespoke step component, no generic fields)
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'review', 'Preview & Publish', 'CheckCircle', 7)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label;
END $$;

-- ── Seed: Rent workflow (steps + fields) ────────────────────────────
DO $$
DECLARE
  v_purpose_id UUID;
  v_step_id UUID;
BEGIN
  SELECT id INTO v_purpose_id FROM public.listing_purposes WHERE key = 'rent';

  -- basic_details (same shape as Sale)
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'basic_details', 'Basic Details', 'FileText', 1)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, options, placeholder, is_required, validation, maps_to, sort_order) VALUES
    (v_step_id, 'title', 'Listing Title', 'text', '[]', 'e.g. Spacious 2BHK for rent near Hitech City', true, '{"minLength":10,"maxLength":120}', 'properties.title', 1),
    (v_step_id, 'description', 'Description', 'textarea', '[]', 'Describe the property...', true, '{"minLength":30,"maxLength":2000}', 'properties.description', 2),
    (v_step_id, 'property_type_id', 'Property Type', 'select', '[]', NULL, true, '{}', 'properties.property_type_id', 3),
    (v_step_id, 'bedrooms', 'Bedrooms (BHK)', 'number', '[]', NULL, true, '{"min":0,"max":20}', 'properties.bedrooms', 4),
    (v_step_id, 'bathrooms', 'Bathrooms', 'number', '[]', NULL, false, '{"min":0,"max":20}', 'properties.bathrooms', 5),
    (v_step_id, 'balconies', 'Balconies', 'number', '[]', NULL, false, '{"min":0,"max":10}', 'properties.balconies', 6),
    (v_step_id, 'built_up_area', 'Built-up Area (sqft)', 'number', '[]', NULL, true, '{"min":1}', 'properties.built_up_area', 7),
    (v_step_id, 'carpet_area', 'Carpet Area (sqft)', 'number', '[]', NULL, false, '{"min":1}', 'properties.carpet_area', 8),
    (v_step_id, 'floor_number', 'Floor Number', 'number', '[]', NULL, false, '{}', 'properties.floor_number', 9),
    (v_step_id, 'total_floors', 'Total Floors', 'number', '[]', NULL, false, '{}', 'properties.total_floors', 10),
    (v_step_id, 'facing', 'Facing', 'select', '["North","South","East","West","North-East","North-West","South-East","South-West"]', NULL, false, '{}', 'properties.facing', 11),
    (v_step_id, 'furnishing', 'Furnishing', 'select', '["Unfurnished","Semi-Furnished","Fully Furnished"]', NULL, false, '{}', 'properties.furnishing', 12),
    (v_step_id, 'age_of_property', 'Age of Property (years)', 'number', '[]', NULL, false, '{"min":0}', 'properties.age_of_property', 13),
    (v_step_id, 'parking', 'Parking Slots', 'number', '[]', NULL, false, '{"min":0}', 'properties.parking', 14),
    (v_step_id, 'ownership_type', 'Owner Type', 'select', '["Individual","Builder","Agent","Power of Attorney"]', NULL, true, '{}', 'properties.ownership_type', 15)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- location
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'location', 'Location', 'MapPin', 2)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, is_required, maps_to, sort_order) VALUES
    (v_step_id, 'location', 'Property Location', 'location', true, 'properties.location', 1)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- pricing (rent-shaped)
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'pricing', 'Rental Details', 'IndianRupee', 3)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, placeholder, is_required, validation, maps_to, sort_order) VALUES
    (v_step_id, 'rent_amount', 'Monthly Rent (₹)', 'number', NULL, true, '{"min":1}', 'properties.rent_amount', 1),
    (v_step_id, 'security_deposit', 'Security Deposit (₹)', 'number', NULL, false, '{"min":0}', 'properties.security_deposit', 2),
    (v_step_id, 'maintenance', 'Monthly Maintenance (₹)', 'number', NULL, false, '{"min":0}', 'features.maintenance', 3),
    (v_step_id, 'available_from', 'Available From', 'date', NULL, false, '{}', 'features.available_from', 4),
    (v_step_id, 'minimum_stay', 'Minimum Stay', 'text', 'e.g. 11 months', false, '{}', 'features.minimum_stay', 5)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- tenant_preference (rent-only step)
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'tenant_preference', 'Tenant Preference', 'Users', 4)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, options, is_required, maps_to, sort_order) VALUES
    (v_step_id, 'tenant_type', 'Preferred Tenants', 'multiselect', '["Family","Bachelor Male","Bachelor Female","Students","Working Professionals"]', false, 'features.tenant_type', 1),
    (v_step_id, 'food_preference', 'Food Preference', 'select', '["Veg Only","Non-Veg Allowed","Both"]', false, 'features.food_preference', 2),
    (v_step_id, 'pets_allowed', 'Pets Allowed', 'boolean', '[]', false, 'features.pets_allowed', 3),
    (v_step_id, 'smoking_allowed', 'Smoking Allowed', 'boolean', '[]', false, 'features.smoking_allowed', 4)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- amenities
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'amenities', 'Amenities', 'Sparkles', 5)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, options, is_required, maps_to, sort_order) VALUES
    (v_step_id, 'amenities', 'Amenities', 'checklist',
      '["Lift","Power Backup","24x7 Security","Gymnasium","Swimming Pool","Club House","Children''s Play Area","Park","CCTV Surveillance","Intercom","Piped Gas","Rain Water Harvesting","Modular Kitchen","Water Storage"]',
      false, 'properties.amenities', 1)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- media
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'media', 'Photos & Documents', 'Image', 6)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_step_id;
  INSERT INTO public.workflow_fields (step_id, field_key, label, field_type, is_required, help_text, validation, maps_to, sort_order) VALUES
    (v_step_id, 'images', 'Photos', 'file', true, 'Upload up to 15 photos, cover photo first', '{"accept":"image/*","multiple":true,"maxFiles":15}', 'properties.images', 1),
    (v_step_id, 'videos', 'Videos', 'file', false, 'Optional walkthrough video(s)', '{"accept":"video/*","multiple":true,"maxFiles":2}', 'properties.videos', 2)
  ON CONFLICT (step_id, field_key) DO NOTHING;

  -- ai_content / review (bespoke step components)
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'ai_content', 'AI Assist', 'Sparkles', 7)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label;
  INSERT INTO public.workflow_steps (purpose_id, step_key, label, icon, sort_order)
    VALUES (v_purpose_id, 'review', 'Preview & Publish', 'CheckCircle', 8)
    ON CONFLICT (purpose_id, step_key) DO UPDATE SET label = EXCLUDED.label;
END $$;
