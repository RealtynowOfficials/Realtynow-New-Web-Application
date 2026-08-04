-- Migration: 20260804070000_0063_property_pincode.sql
-- Description: Adds the postal/PIN code column needed for Google Maps auto location
-- sync (Places Autocomplete + reverse geocoding fills city/state/country/pincode
-- alongside lat/lng). `state`/`country` already exist on public.properties as of
-- migration 0052; only `pincode` was missing.

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pincode TEXT;
