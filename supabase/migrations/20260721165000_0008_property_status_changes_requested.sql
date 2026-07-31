-- Add changes_requested to property status

-- 1. Drop existing constraint if it exists (try standard names)
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;

-- PostgreSQL names constraints automatically if not named, often as table_column_check
-- Let's define it explicitly this time so it's safer for the future
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
  CHECK (status in ('draft','submitted','pending_verification','changes_requested','approved','published','rejected','archived'));
