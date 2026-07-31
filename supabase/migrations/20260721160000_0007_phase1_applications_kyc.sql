/*
  Phase 1 – Enterprise Business Flow
  Adds:
    1. agent_applications  – public registration requests from prospective agents
    2. builder_applications – public registration requests from builders/developers
    3. kyc_verifications   – optional KYC documents uploaded by customers
  Also extends:
    - profiles.role check to include 'builder'
*/

-- =========================================================
-- EXTEND PROFILES ROLE
-- =========================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer','agent','admin','builder'));

-- =========================================================
-- AGENT APPLICATIONS
-- =========================================================
create table if not exists public.agent_applications (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text not null,
  license_number text,
  specialization text,
  assigned_areas text[],
  experience_years int,
  company       text,
  bio           text,
  id_doc_url    text,   -- govt ID / Aadhaar
  license_doc_url text, -- RERA license image
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.agent_applications enable row level security;

-- Anyone (anon) can submit an application
drop policy if exists "agent_app_insert_anon" on public.agent_applications;
create policy "agent_app_insert_anon" on public.agent_applications
  for insert to anon, authenticated with check (true);

-- Admin can read / update all
drop policy if exists "agent_app_admin" on public.agent_applications;
create policy "agent_app_admin" on public.agent_applications
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Applicant can read their own (by email – no auth yet)
-- We'll rely on admin to read in the portal; applicants only get a success message.

-- =========================================================
-- BUILDER APPLICATIONS
-- =========================================================
create table if not exists public.builder_applications (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  contact_name     text not null,
  email            text not null,
  phone            text not null,
  gst_number       text,
  rera_number      text,
  established_year int,
  city             text,
  description      text,
  website_url      text,
  logo_url         text,
  gst_doc_url      text,
  rera_doc_url     text,
  pan_doc_url      text,
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by      uuid references public.profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.builder_applications enable row level security;

drop policy if exists "builder_app_insert_anon" on public.builder_applications;
create policy "builder_app_insert_anon" on public.builder_applications
  for insert to anon, authenticated with check (true);

drop policy if exists "builder_app_admin" on public.builder_applications;
create policy "builder_app_admin" on public.builder_applications
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================================================
-- KYC VERIFICATIONS
-- =========================================================
create table if not exists public.kyc_verifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  id_type        text not null check (id_type in ('aadhaar','pan','passport','voter_id','driving_license')),
  id_number      text,
  front_url      text,   -- front of ID doc
  back_url       text,   -- back of ID doc (optional)
  selfie_url     text,   -- selfie with doc (optional)
  status         text not null default 'pending'
                   check (status in ('pending','verified','rejected')),
  rejection_reason text,
  verified_by    uuid references public.profiles(id),
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.kyc_verifications enable row level security;

-- Owner can CRUD their own KYC
drop policy if exists "kyc_owner" on public.kyc_verifications;
create policy "kyc_owner" on public.kyc_verifications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin can read / update all
drop policy if exists "kyc_admin" on public.kyc_verifications;
create policy "kyc_admin" on public.kyc_verifications
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================================================
-- updated_at auto-trigger helpers
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agent_applications_updated_at on public.agent_applications;
create trigger agent_applications_updated_at
  before update on public.agent_applications
  for each row execute function public.set_updated_at();

drop trigger if exists builder_applications_updated_at on public.builder_applications;
create trigger builder_applications_updated_at
  before update on public.builder_applications
  for each row execute function public.set_updated_at();

drop trigger if exists kyc_verifications_updated_at on public.kyc_verifications;
create trigger kyc_verifications_updated_at
  before update on public.kyc_verifications
  for each row execute function public.set_updated_at();
