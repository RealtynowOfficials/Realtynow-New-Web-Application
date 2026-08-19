-- The otp-auth edge function's account-lookup fallback (admin.auth.admin.listUsers()
-- + client-side scan) proved unreliable in production: it failed to find an
-- auth.users row that provably existed with an exact matching phone and
-- synthetic email, causing createUser() to fail with GoTrue's own
-- "Phone number already registered by another user" error being surfaced to
-- users who already had a valid account. This RPC queries auth.users
-- directly (the source of truth) instead of the Admin API's user list scan.
create or replace function public.find_auth_user_id_by_phone(p_mobile text)
returns uuid
language sql
security definer
set search_path = public, auth
stable
as $$
  select id from auth.users
  where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = p_mobile
     or email = 'p' || p_mobile || '@phone.realtynow.internal'
  limit 1;
$$;

revoke all on function public.find_auth_user_id_by_phone(text) from public;
revoke all on function public.find_auth_user_id_by_phone(text) from anon;
revoke all on function public.find_auth_user_id_by_phone(text) from authenticated;
grant execute on function public.find_auth_user_id_by_phone(text) to service_role;
