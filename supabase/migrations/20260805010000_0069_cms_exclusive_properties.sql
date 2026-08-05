-- Migration: 20260805010000_0069_cms_exclusive_properties.sql
-- Description: Create cms_exclusive_properties table for RealtyNow Exclusive Homepage Section

CREATE TABLE IF NOT EXISTS public.cms_exclusive_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  locality TEXT,
  price_text TEXT,
  badge_text TEXT DEFAULT 'Exclusive Project',
  rera_no TEXT,
  image_url TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Enquire Now',
  cta_link TEXT DEFAULT '/search',
  sort_order INT DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cms_exclusive_properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "public_read_cms_exclusive" ON public.cms_exclusive_properties;
DROP POLICY IF EXISTS "admin_all_cms_exclusive" ON public.cms_exclusive_properties;

-- Open read & write policies
CREATE POLICY "public_read_cms_exclusive" ON public.cms_exclusive_properties FOR SELECT USING (true);
CREATE POLICY "admin_all_cms_exclusive" ON public.cms_exclusive_properties FOR ALL USING (true);

-- Add to Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cms_exclusive_properties;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Seed Default Exclusive Properties Cards
INSERT INTO public.cms_exclusive_properties (title, subtitle, locality, price_text, badge_text, rera_no, image_url, cta_text, cta_link, sort_order)
VALUES
(
  'Crystal Garden',
  '3 & 4 BHK Luxury Apartment',
  'Attapur, Hyderabad',
  'Starting at ₹1.29 Cr.',
  'Sponsored Project',
  'Phase 1 P02500004287',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
  'Enquire Now',
  '/search',
  1
),
(
  'Ananda Vihara',
  '1 BHK Luxury Service Suite',
  'Tirupati',
  'Price: ₹69 Lakhs Onw.',
  'Vacation Home Ownership',
  'RERA.P10120276492',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'Enquire Now',
  '/search',
  2
),
(
  'Eternia Benchmark',
  '7.5 Acres | 2, 2.5 & 3 BHK Homes',
  'Bachupally, Hyderabad',
  '₹1.2 Cr* Onwards',
  'New Benchmark',
  'RERA Approved',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'Enquire Now',
  '/search',
  3
),
(
  'DLF Camellias Heights',
  '4 & 5 BHK Ultra Luxury Penthouses',
  'Gachibowli, Hyderabad',
  '₹3.5 Cr* Onwards',
  'Exclusive Launch',
  'RERA.P02400009821',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'Enquire Now',
  '/search',
  4
)
ON CONFLICT DO NOTHING;
