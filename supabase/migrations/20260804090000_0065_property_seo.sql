-- Migration: 20260804090000_0065_property_seo.sql
-- Description: AI-generated SEO metadata for property listings. Replaces the customer-facing
-- "SEO & Discoverability" wizard step — these columns are now written server-side by the
-- generatePropertySeo edge function (triggered on submit/resubmit/approve) instead of being
-- typed in by the customer. Public read stays open (existing properties RLS already covers
-- these new columns) since the whole point is that search engines/meta tags can read them;
-- only the admin panel gets an edit UI for manual overrides.

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_slug TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS og_title TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS og_description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS og_image TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS twitter_title TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS twitter_description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS twitter_image TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS json_ld JSONB;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS image_alt_text JSONB DEFAULT '[]';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_properties_seo_slug ON public.properties (seo_slug);
