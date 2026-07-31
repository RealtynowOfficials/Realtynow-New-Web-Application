-- Migration: 20260727020000_0052_property_advanced_filters.sql
-- Description: Add columns for advanced filtering (possession, state, verified, AI score)

-- 1. Add new columns
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS possession_status text CHECK (possession_status IN ('Ready to Move', 'Under Construction', 'New Launch'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS verified_status text DEFAULT 'Unverified' CHECK (verified_status IN ('Unverified', 'Owner Listed', 'Agent Listed', 'Builder Listed', 'Verified'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ai_score int DEFAULT 75;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country text DEFAULT 'India';

-- 2. Recreate v_properties_search to include new columns in search text if needed
-- We also ensure that we just select * which automatically includes the new columns on the view if we recreate it.
DROP VIEW IF EXISTS public.v_properties_search;

CREATE OR REPLACE VIEW public.v_properties_search WITH (security_invoker = true) AS
SELECT 
  p.*,
  c.name AS city_name,
  l.name AS locality_name,
  pt.name AS property_type_name,
  (
    COALESCE(p.title, '') || ' ' || 
    COALESCE(p.description, '') || ' ' || 
    COALESCE(p.address, '') || ' ' || 
    COALESCE(c.name, '') || ' ' || 
    COALESCE(l.name, '') || ' ' || 
    COALESCE(pt.name, '') || ' ' || 
    COALESCE(b.name, '') || ' ' || 
    COALESCE(pr.name, '') || ' ' || 
    COALESCE(prof_agent.first_name, '') || ' ' || COALESCE(prof_agent.last_name, '') || ' ' || 
    COALESCE(prof_owner.first_name, '') || ' ' || COALESCE(prof_owner.last_name, '') || ' ' ||
    COALESCE(p.state, '')
  ) AS search_text
FROM public.properties p
LEFT JOIN public.cities c ON p.city_id = c.id
LEFT JOIN public.localities l ON p.locality_id = l.id
LEFT JOIN public.property_types pt ON p.property_type_id = pt.id
LEFT JOIN public.builders b ON p.builder_id = b.id
LEFT JOIN public.projects pr ON p.project_id = pr.id
LEFT JOIN public.profiles prof_agent ON p.assigned_agent_id = prof_agent.id
LEFT JOIN public.profiles prof_owner ON p.owner_id = prof_owner.id;

GRANT SELECT ON public.v_properties_search TO authenticated, anon;

-- Update existing data randomly for demonstration
UPDATE public.properties 
SET 
  possession_status = (ARRAY['Ready to Move', 'Under Construction', 'New Launch'])[floor(random() * 3 + 1)],
  verified_status = (ARRAY['Owner Listed', 'Agent Listed', 'Builder Listed', 'Verified'])[floor(random() * 4 + 1)],
  ai_score = floor(random() * 30 + 70)::int,
  state = 'Telangana';
