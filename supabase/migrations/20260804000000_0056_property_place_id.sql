-- Migration: 20260804000000_0056_property_place_id.sql
-- Description: Adds place_id to properties so the Location step's Google
--              Places Autocomplete (src/pages/portal/list-property.tsx) can
--              persist which exact place the owner selected, alongside the
--              existing latitude/longitude/address/city_name/locality_name.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS place_id TEXT;
