-- Migration: 20260727030000_0053_hero_campaigns.sql
-- Description: Dedicated, admin-managed Hero Campaign system for the public homepage hero carousel.
-- Supersedes the earlier decision to read the homepage hero from public.advertisements
-- (placement = 'Hero'); that code path / table is left untouched for backward compatibility.

CREATE TABLE IF NOT EXISTS public.hero_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  banner_image TEXT,
  mobile_banner TEXT,
  logo TEXT,
  cta_text TEXT DEFAULT 'Explore Now',
  cta_url TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  campaign_type TEXT DEFAULT 'Free' CHECK (campaign_type IN ('Paid', 'Free')),
  priority INT DEFAULT 1,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  order_no INT DEFAULT 0,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hero_campaigns_status ON public.hero_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_hero_campaigns_city_id ON public.hero_campaigns (city_id);
CREATE INDEX IF NOT EXISTS idx_hero_campaigns_order_no ON public.hero_campaigns (order_no);

-- Keep updated_at current on every row update
CREATE OR REPLACE FUNCTION public.set_hero_campaigns_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hero_campaigns_updated_at ON public.hero_campaigns;
CREATE TRIGGER trg_hero_campaigns_updated_at
  BEFORE UPDATE ON public.hero_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hero_campaigns_updated_at();

ALTER TABLE public.hero_campaigns ENABLE ROW LEVEL SECURITY;

-- Public/anon may only read Active campaigns (schedule window is filtered client-side,
-- matching the existing public.advertisements pattern).
DROP POLICY IF EXISTS "anon_select_active_hero_campaigns" ON public.hero_campaigns;
CREATE POLICY "anon_select_active_hero_campaigns" ON public.hero_campaigns
  FOR SELECT TO anon, authenticated
  USING (status = 'Active');

-- Admins have full CRUD access.
DROP POLICY IF EXISTS "admin_all_hero_campaigns" ON public.hero_campaigns;
CREATE POLICY "admin_all_hero_campaigns" ON public.hero_campaigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
