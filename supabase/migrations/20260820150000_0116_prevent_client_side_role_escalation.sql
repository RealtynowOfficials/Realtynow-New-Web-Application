-- Critical gap found during a role-routing security review: the
-- profiles UPDATE RLS policies (profiles_update / profiles_update_own) only
-- check `auth.uid() = id`, with no column-level restriction — meaning any
-- authenticated user could call
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', myOwnId)
-- directly from the browser and it would succeed, self-promoting to
-- admin/builder/agent. RLS policies can't restrict individual columns, so
-- this needs a trigger. Role changes must only ever happen through the
-- trusted server-side paths that already exist (otp-auth, admin-security),
-- which both run under the service_role Postgres role, or through a genuine
-- admin acting via the app's own admin tooling (already the same trust
-- boundary the existing RLS policies grant via is_admin()).
--
-- Superseded by 0117 below (broadens the trusted-role allowlist to also
-- cover direct `postgres` superuser connections, e.g. migrations/admin SQL
-- access) — kept as its own migration for history.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Changing profiles.role directly is not permitted. Role changes must go through a trusted server-side flow.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();
