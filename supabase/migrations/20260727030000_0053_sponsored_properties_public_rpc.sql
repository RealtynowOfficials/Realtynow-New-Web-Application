-- Migration: 20260727030000_0053_sponsored_properties_public_rpc.sql
-- Description: Public read path for the homepage "Featured / Sponsored Properties"
--              carousel. sponsored_listings RLS only allows the owning agent/staff to
--              read rows directly, so this SECURITY DEFINER RPC exposes just the
--              active-campaign property ids (+ priority/campaign metadata) to anon,
--              mirroring the fn_get_active_banners() pattern from migration 0033.

CREATE OR REPLACE FUNCTION public.fn_get_active_sponsored_property_ids(
  p_limit INT DEFAULT 12
)
RETURNS TABLE (
  property_id     UUID,
  sponsored_type  TEXT,
  priority_score  INT,
  ends_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sub.property_id, sub.sponsored_type, sub.priority_score, sub.ends_at
  FROM (
    SELECT DISTINCT ON (sl.property_id)
      sl.property_id,
      sl.sponsored_type,
      sl.priority_score,
      sl.ends_at,
      sl.created_at
    FROM public.sponsored_listings sl
    JOIN public.properties p ON p.id = sl.property_id
    WHERE sl.status = 'active'
      AND sl.starts_at <= now()
      AND (sl.ends_at IS NULL OR sl.ends_at > now())
      AND (p.status = 'published' OR p.is_live = true)
    ORDER BY sl.property_id, sl.priority_score DESC, sl.created_at DESC
  ) sub
  ORDER BY sub.priority_score DESC, sub.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_active_sponsored_property_ids(INT) TO anon, authenticated;
