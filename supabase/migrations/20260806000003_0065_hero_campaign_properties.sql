-- Migration: 20260806000003_0065_hero_campaign_properties.sql
-- Description: Extend hero_campaigns to link directly to properties with priority tiers.

-- Add property_id
ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;

-- Add package_tier to define priority levels
-- Example tiers: Platinum, Gold, Silver, Featured, Free
ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'Free' CHECK (package_tier IN ('Platinum', 'Gold', 'Silver', 'Featured', 'Free'));

-- Add pinning support
ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add display_type to control rendering style
ALTER TABLE public.hero_campaigns
ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'Hero Banner' CHECK (display_type IN ('Hero Banner', 'Featured Slider', 'Premium Card'));

-- Create index for property lookups
CREATE INDEX IF NOT EXISTS idx_hero_campaigns_property_id ON public.hero_campaigns (property_id);
