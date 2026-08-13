/*
  Service Active/Inactive kill-switch for Agent, Builder, and List Property.

  Adds a centralized `service_settings` table (source of truth, not a React
  constant) plus an audit trail (`service_status_logs`), a public read-only
  status-check function used by both RLS and the client, and an admin-only
  RPC that flips status + writes the audit row atomically.

  Enforcement is layered:
  - DB (this migration): RESTRICTIVE RLS policies on the INSERT path for
    agent_applications, builder_applications, and properties — these AND
    against whatever permissive policy already allows the insert, so a
    disabled service blocks the write even via a direct API call, with zero
    change to behavior while the service stays active (is_service_active
    defaults true for any unconfigured key, so nothing already-live breaks).
  - Frontend/route-guard enforcement is added separately in application code.

  Existing agent_applications/builder_applications RLS already has multiple
  overlapping permissive policies (including a `USING(true) WITH CHECK(true)`
  ALL policy for any authenticated user) — that pre-existing looseness is out
  of scope for this migration; RESTRICTIVE policies are additive and don't
  require touching those.
*/

create table if not exists public.service_settings (
  id uuid primary key default gen_random_uuid(),
  service_key text unique not null,
  service_name text not null,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.service_settings (service_key, service_name) values
  ('agent', 'Agent Service'),
  ('builder', 'Builder Service'),
  ('list_property', 'List Property Service')
on conflict (service_key) do nothing;

alter table public.service_settings enable row level security;

drop policy if exists service_settings_select on public.service_settings;
create policy service_settings_select on public.service_settings
  for select to anon, authenticated using (true);

drop policy if exists service_settings_admin_write on public.service_settings;
create policy service_settings_admin_write on public.service_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.service_status_logs (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  previous_status boolean not null,
  new_status boolean not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  changed_at timestamptz not null default now()
);

alter table public.service_status_logs enable row level security;

drop policy if exists service_status_logs_admin_read on public.service_status_logs;
create policy service_status_logs_admin_read on public.service_status_logs
  for select to authenticated using (public.is_admin());
-- No client insert policy — only fn_set_service_status (SECURITY DEFINER) writes here.

create or replace function public.is_service_active(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_active from public.service_settings where service_key = p_key), true);
$$;
grant execute on function public.is_service_active(text) to anon, authenticated;

create or replace function public.fn_set_service_status(p_key text, p_active boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev boolean;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin access required';
  end if;

  select is_active into v_prev from public.service_settings where service_key = p_key;
  if v_prev is null then
    raise exception 'Unknown service key: %', p_key;
  end if;

  update public.service_settings
  set is_active = p_active, updated_by = auth.uid(), updated_at = now()
  where service_key = p_key;

  insert into public.service_status_logs (service_key, previous_status, new_status, changed_by, reason)
  values (p_key, v_prev, p_active, auth.uid(), p_reason);

  return jsonb_build_object('success', true, 'service_key', p_key, 'is_active', p_active);
end;
$$;
grant execute on function public.fn_set_service_status(text, boolean, text) to authenticated;

alter table public.service_settings replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.service_settings;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ── RESTRICTIVE gates: AND against every existing permissive INSERT policy ──
drop policy if exists agent_applications_service_gate on public.agent_applications;
create policy agent_applications_service_gate on public.agent_applications
  as restrictive for insert to anon, authenticated
  with check (public.is_service_active('agent'));

drop policy if exists builder_applications_service_gate on public.builder_applications;
create policy builder_applications_service_gate on public.builder_applications
  as restrictive for insert to anon, authenticated
  with check (public.is_service_active('builder'));

drop policy if exists properties_service_gate on public.properties;
create policy properties_service_gate on public.properties
  as restrictive for insert to authenticated
  with check (public.is_service_active('list_property'));
