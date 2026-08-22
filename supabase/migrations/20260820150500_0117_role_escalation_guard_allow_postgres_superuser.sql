-- The service_role-only check in 0116 would also have blocked direct
-- migration/admin SQL access (which runs as the `postgres` superuser, not
-- `service_role`) from ever changing profiles.role. Both are trusted,
-- non-browser database connections — only actual end-user browser sessions
-- (Postgres role `authenticated`/`anon`) need to be restricted.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Changing profiles.role directly is not permitted. Role changes must go through a trusted server-side flow.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
