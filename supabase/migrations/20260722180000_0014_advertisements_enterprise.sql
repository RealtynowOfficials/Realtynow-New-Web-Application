-- Migration: 20260722180000_0014_advertisements_enterprise.sql
-- Description: Master Enterprise Advertisement & Banner System schema, Realtime publication, and tracking functions.

-- 1. Ensure public.advertisements table exists with full enterprise columns
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  banner_type TEXT DEFAULT 'Homepage',
  placement TEXT DEFAULT 'Middle',
  image_url TEXT,
  image_desktop TEXT,
  image_mobile TEXT,
  video_url TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  cta_link TEXT,
  link_url TEXT,
  redirect_type TEXT DEFAULT 'External URL',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  category_name TEXT,
  priority INT DEFAULT 1,
  display_order INT DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT true,
  schedule_publishing BOOLEAN DEFAULT false,
  target_audience TEXT DEFAULT 'All Users',
  city_targeting TEXT DEFAULT 'All Cities',
  device_targeting TEXT DEFAULT 'All Devices',
  impression_limit INT DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  seo_alt_text TEXT,
  image_caption TEXT,
  banner_tags TEXT[],
  internal_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns safely if table already exists
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS banner_type TEXT DEFAULT 'Homepage';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS image_desktop TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS image_mobile TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Learn More';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS cta_link TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS redirect_type TEXT DEFAULT 'External URL';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT true;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS schedule_publishing BOOLEAN DEFAULT false;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'All Users';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS city_targeting TEXT DEFAULT 'All Cities';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS device_targeting TEXT DEFAULT 'All Devices';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS impression_limit INT DEFAULT 0;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS seo_alt_text TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS image_caption TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS banner_tags TEXT[];
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS internal_comments TEXT;

-- 2. Enable REPLICA IDENTITY FULL for Supabase Realtime
ALTER TABLE public.advertisements REPLICA IDENTITY FULL;

-- 3. Add to Supabase Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.advertisements;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Enable RLS Policies
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_ads" ON public.advertisements;
CREATE POLICY "anon_select_active_ads" ON public.advertisements
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_all_ads" ON public.advertisements;
CREATE POLICY "admin_all_ads" ON public.advertisements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Stored RPC Functions for Click & Impression Tracking
CREATE OR REPLACE FUNCTION public.increment_ad_click(p_ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.advertisements
  SET clicks = COALESCE(clicks, 0) + 1,
      updated_at = now()
  WHERE id = p_ad_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ad_impression(p_ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.advertisements
  SET impressions = COALESCE(impressions, 0) + 1,
      updated_at = now()
  WHERE id = p_ad_id;
END;
$$;
