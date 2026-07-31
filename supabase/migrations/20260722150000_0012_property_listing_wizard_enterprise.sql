-- Migration: 20260722150000_0012_property_listing_wizard_enterprise.sql
-- Description: Expand property schema to support 13-step listing wizard, PG/Co-Living specs, SEO metadata, nearby places, and draft saving.

-- Update purpose check constraint to support PG, Co-Living, Hostel, Lease, Short Stay, Vacation Rental
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_purpose_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_purpose_check 
  CHECK (purpose IN ('Sale','Rent','Lease','PG','CoLiving','Hostel','Short Stay','Vacation Rental','Commercial'));

-- Add enterprise listing wizard columns if they don't exist
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_category TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_sub_type TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pg_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS nearby_places JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS availability_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ownership_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '{}'::jsonb;

-- Create draft_properties table for auto-saving drafts
CREATE TABLE IF NOT EXISTS public.draft_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  step_index INT NOT NULL DEFAULT 0,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.draft_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drafts_select_own" ON public.draft_properties;
CREATE POLICY "drafts_select_own" ON public.draft_properties FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "drafts_write_own" ON public.draft_properties;
CREATE POLICY "drafts_write_own" ON public.draft_properties FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
