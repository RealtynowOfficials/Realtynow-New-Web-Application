-- Migration: 20260805150000_0073_property_google_maps_fields.sql
-- Description: Adds text columns for Google Maps Places Autocomplete integration
-- to store structured location data seamlessly alongside the relational schema.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT;
