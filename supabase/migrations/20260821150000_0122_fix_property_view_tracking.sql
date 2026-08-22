-- Root cause of "Views always shows 0": increment_property_view() (the
-- AFTER INSERT trigger on property_views that bumps properties.view_count)
-- was never marked SECURITY DEFINER. It runs as whatever role triggered
-- the INSERT into property_views — for a stranger/guest viewing someone
-- ELSE's property, that's the `anon`/`authenticated` Postgres role via
-- PostgREST, which does NOT satisfy any of the properties UPDATE RLS
-- policies (all scoped to owner/assigned_agent/staff). The internal
-- `UPDATE properties SET view_count = view_count + 1` therefore silently
-- matched zero rows — no error, just no increment. Ironically the only
-- case that WOULD have worked is the property owner/agent/admin viewing
-- their own listing, which is exactly the case the product spec says
-- must NOT count as a customer view. Marking this SECURITY DEFINER makes
-- the increment authoritative regardless of who's viewing, matching the
-- same trust boundary already used by admin_make_property_live() etc.
CREATE OR REPLACE FUNCTION public.increment_property_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  update public.properties set view_count = view_count + 1 where id = new.property_id;
  return new;
end
$function$;

-- property_views RLS had two generations of policies stacked on top of
-- each other: a correctly-scoped pair (property_views_insert / _select /
-- pviews_insert / pviews_owner_read) alongside leftover "_clean" policies
-- (property_views_read_clean, property_views_write_clean) that grant
-- `true` for every command including UPDATE/DELETE to anyone. Since RLS
-- policies are permissive (any match grants access), the loose "_clean"
-- policies were silently overriding the intended restriction — anyone
-- could read or tamper with any property's view-event log. View events
-- are an immutable log (no legitimate UPDATE/DELETE by any client), so
-- there should be no write-after-insert policy at all.
DROP POLICY IF EXISTS property_views_write_clean ON public.property_views;
DROP POLICY IF EXISTS property_views_read_clean ON public.property_views;

-- Direct tampering guard: properties UPDATE RLS has no column-level
-- restriction (same class of gap as profiles.role, fixed in 0116/0117),
-- so a property owner/agent could otherwise smuggle an arbitrary
-- view_count into a normal property-edit save request. Only the
-- SECURITY DEFINER increment function (which runs as its owning role,
-- typically `postgres`) may change it going forward.
CREATE OR REPLACE FUNCTION public.prevent_view_count_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_count IS DISTINCT FROM OLD.view_count
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'view_count can only be changed via the property view tracking function.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_view_count_tampering ON public.properties;
CREATE TRIGGER trg_prevent_view_count_tampering
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.prevent_view_count_tampering();
