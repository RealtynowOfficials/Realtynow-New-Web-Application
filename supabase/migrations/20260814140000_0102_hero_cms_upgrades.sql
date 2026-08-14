-- Migration: 20260814140000_0102_hero_cms_upgrades.sql
-- Description: Upgrade hero_campaigns with RERA number, developer logo, overlay position & opacity, CTA controls, and normalized hero_campaign_features child table.

-- 1. Extend hero_campaigns table
ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS rera_number TEXT;

ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS developer_logo TEXT;

ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS overlay_position TEXT DEFAULT 'right' CHECK (overlay_position IN ('left', 'right', 'center', 'both'));

ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS overlay_opacity NUMERIC DEFAULT 0.85;

ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS content_alignment TEXT DEFAULT 'left' CHECK (content_alignment IN ('left', 'center', 'right'));

ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS cta_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- 2. Create normalized child table for dynamic hero features
CREATE TABLE IF NOT EXISTS public.hero_campaign_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_campaign_id UUID NOT NULL REFERENCES public.hero_campaigns(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hero_campaign_features_campaign_id ON public.hero_campaign_features(hero_campaign_id);
CREATE INDEX IF NOT EXISTS idx_hero_campaign_features_order ON public.hero_campaign_features(display_order);

-- Trigger to maintain updated_at on hero_campaign_features
CREATE OR REPLACE FUNCTION public.set_hero_campaign_features_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hero_campaign_features_updated_at ON public.hero_campaign_features;
CREATE TRIGGER trg_hero_campaign_features_updated_at
  BEFORE UPDATE ON public.hero_campaign_features
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hero_campaign_features_updated_at();

-- 3. Row Level Security for hero_campaign_features
ALTER TABLE public.hero_campaign_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hero_features" ON public.hero_campaign_features;
CREATE POLICY "anon_select_hero_features" ON public.hero_campaign_features
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hero_campaigns
    WHERE id = hero_campaign_features.hero_campaign_id
    AND status = 'Active'
  ));

DROP POLICY IF EXISTS "admin_all_hero_features" ON public.hero_campaign_features;
CREATE POLICY "admin_all_hero_features" ON public.hero_campaign_features
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ensure advertisements bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('advertisements', 'advertisements', true)
ON CONFLICT (id) DO NOTHING;
