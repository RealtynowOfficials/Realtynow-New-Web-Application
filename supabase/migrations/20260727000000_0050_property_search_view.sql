-- Migration: 20260727000000_0050_property_search_view.sql
-- Description: Create a unified view for properties to support advanced text search across related tables

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
    COALESCE(prof_owner.first_name, '') || ' ' || COALESCE(prof_owner.last_name, '')
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
