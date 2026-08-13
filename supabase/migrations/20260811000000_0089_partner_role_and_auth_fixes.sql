/*
  Partner role + shared Agent/Builder/Partner OTP auth pipeline.

  Adds:
    1. 'partner' to profiles.role
    2. partner_applications  – public registration requests from prospective partners
    3. partners              – activated partner accounts (created on approval)
    4. 'partner' to application_activity_logs.application_type
    5. partner-documents storage bucket + anon upload policy
  Fixes:
    6. Drops admin_portal_update_profiles / admin_portal_insert_profiles (added in
       migration 0068) — these let ANY anon/authenticated caller UPDATE or INSERT
       any row in public.profiles, including flipping their own role to 'admin'.
       They were superseded in intent by 0057's stricter profiles_update /
       profiles_insert_self policies but never removed. The unified OTP pipeline's
       server-side role check (otp-auth reads profiles.role) is only trustworthy if
       profiles can't be rewritten by an arbitrary client, so this must close.
*/

-- =========================================================
-- 1. EXTEND PROFILES ROLE
-- =========================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer','agent','admin','builder','partner','sales_executive','verification_executive','super_admin'));

-- =========================================================
-- 2. PARTNER APPLICATIONS
-- =========================================================
create sequence if not exists public.partner_application_number_seq start 1;

create table if not exists public.partner_applications (
  id                            uuid primary key default gen_random_uuid(),
  application_number            text unique,
  full_name                     text not null,
  mobile_number                 text not null,
  email                         text,
  partner_type                  text not null,
  company_name                  text,
  business_registration_number  text,
  gst_number                    text,
  pan_number                    text,
  years_of_experience           int,
  website                       text,
  address_line_1                text,
  address_line_2                text,
  country                       text default 'India',
  state                         text,
  city                          text,
  district                      text,
  pincode                       text,
  professional_experience       text,
  area_of_expertise             text,
  preferred_property_types      jsonb default '[]'::jsonb,
  preferred_locations           jsonb default '[]'::jsonb,
  expected_monthly_leads        int,
  current_business_volume       text,
  real_estate_experience        text,
  description                   text,
  pan_doc_url                   text,
  id_doc_url                    text,
  gst_doc_url                   text,
  business_reg_doc_url          text,
  address_proof_doc_url         text,
  other_doc_url                 text,
  status                        text not null default 'submitted'
                                   check (status in (
                                     'submitted', 'pending_review', 'document_verification',
                                     'final_review', 'approved', 'rejected',
                                     'suspended', 'cancelled'
                                   )),
  admin_notes                   text,
  rejection_reason              text,
  assigned_admin                uuid references public.profiles(id),
  reviewed_by                   uuid references public.profiles(id),
  reviewed_at                   timestamptz,
  approved_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create or replace function public.set_partner_application_number()
returns trigger language plpgsql as $$
begin
  if new.application_number is null then
    new.application_number := 'RNP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.partner_application_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists partner_applications_set_number on public.partner_applications;
create trigger partner_applications_set_number
  before insert on public.partner_applications
  for each row execute function public.set_partner_application_number();

drop trigger if exists partner_applications_updated_at on public.partner_applications;
create trigger partner_applications_updated_at
  before update on public.partner_applications
  for each row execute function public.set_updated_at();

alter table public.partner_applications enable row level security;

drop policy if exists "partner_app_insert_anon" on public.partner_applications;
create policy "partner_app_insert_anon" on public.partner_applications
  for insert to anon, authenticated with check (true);

drop policy if exists "partner_app_admin" on public.partner_applications;
create policy "partner_app_admin" on public.partner_applications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_partner_applications_mobile on public.partner_applications(mobile_number);
create index if not exists idx_partner_applications_status on public.partner_applications(status);

-- =========================================================
-- 3. PARTNERS (activated accounts, created on approval)
-- =========================================================
create sequence if not exists public.partner_code_seq start 1;

create table if not exists public.partners (
  id                  uuid primary key default gen_random_uuid(),
  partner_code        text unique,
  application_id      uuid references public.partner_applications(id),
  user_id             uuid references auth.users(id) on delete set null,
  full_name           text not null,
  mobile_number       text not null unique,
  email               text,
  partner_type        text,
  company_name        text,
  status              text not null default 'active'
                        check (status in ('active','suspended','inactive')),
  verification_status text default 'pending',
  approved_by         uuid references public.profiles(id),
  approved_at         timestamptz,
  last_login_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function public.set_partner_code()
returns trigger language plpgsql as $$
begin
  if new.partner_code is null then
    new.partner_code := 'RNP-' || lpad(nextval('public.partner_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists partners_set_code on public.partners;
create trigger partners_set_code
  before insert on public.partners
  for each row execute function public.set_partner_code();

drop trigger if exists partners_updated_at on public.partners;
create trigger partners_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;

drop policy if exists "partners_select_own" on public.partners;
create policy "partners_select_own" on public.partners
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "partners_update_own" on public.partners;
create policy "partners_update_own" on public.partners
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "partners_admin" on public.partners;
create policy "partners_admin" on public.partners
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create unique index if not exists idx_partners_user_id on public.partners(user_id) where user_id is not null;

-- =========================================================
-- 4. APPLICATION ACTIVITY LOGS — allow 'partner' type
-- =========================================================
alter table public.application_activity_logs
  drop constraint if exists application_activity_logs_application_type_check;
alter table public.application_activity_logs
  add constraint application_activity_logs_application_type_check
  check (application_type in ('agent', 'builder', 'partner'));

-- =========================================================
-- 5. STORAGE — partner-documents bucket
-- =========================================================
insert into storage.buckets (id, name, public)
values ('partner-documents', 'partner-documents', false)
on conflict (id) do nothing;

drop policy if exists "anon_insert_partner_documents" on storage.objects;
create policy "anon_insert_partner_documents" on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'partner-documents');

drop policy if exists "auth_rw_partner_documents" on storage.objects;
create policy "auth_rw_partner_documents" on storage.objects for select
  to authenticated using (bucket_id = 'partner-documents');

drop policy if exists "auth_delete_partner_documents" on storage.objects;
create policy "auth_delete_partner_documents" on storage.objects for delete
  to authenticated using (bucket_id = 'partner-documents');

-- =========================================================
-- 6. SECURITY FIX — close the anyone-can-rewrite-any-profile/property RLS gap
-- =========================================================
drop policy if exists "admin_portal_update_profiles" on public.profiles;
drop policy if exists "admin_portal_insert_profiles" on public.profiles;
drop policy if exists "admin_portal_update_properties" on public.properties;

-- =========================================================
-- 7. SECURITY FIX — legacy admin-portal tables were fully world-readable
--    (RLS disabled entirely; admins.password_hash, admin_sessions.session_token
--    etc. were selectable by anon via the REST API). Admin auth has moved to
--    the same Supabase Auth session every other role uses (profiles.role IN
--    ('admin','super_admin'), see is_admin()) plus admin-security's
--    server-verified bcrypt secret code — none of these tables are read or
--    written by the client anymore, only by service-role edge functions, so
--    they can be locked to zero client-facing policies.
-- =========================================================
alter table public.admins enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_login_history enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_trusted_devices enable row level security;

-- Drop any pre-existing policies on these tables so RLS-enabled-with-zero-
-- policies actually means deny-all to anon/authenticated (service role always
-- bypasses RLS regardless).
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('admins', 'admin_sessions', 'admin_login_history', 'admin_audit_logs', 'admin_trusted_devices')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Password-based admin login is fully retired (first factor is now phone
-- OTP via the standard Supabase Auth flow) — stop storing a password hash
-- at all rather than leaving a dead, previously-compromised field around.
alter table public.admins drop column if exists password_hash;
