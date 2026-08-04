-- Migration: 20260727030000_0053_hero_carousel_ads_fields.sql
-- Description: Add hero-carousel-specific fields to public.advertisements
--   (Builder/Project logo persistence fix, free-text price/offer, free-text location).
--   Extends the existing enterprise advertisements table introduced in migration 0014
--   rather than creating a new table, per repo convention of reusing the existing
--   Admin > Content > Advertisements CMS for the homepage hero carousel.

ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS price_text TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS location_text TEXT;
