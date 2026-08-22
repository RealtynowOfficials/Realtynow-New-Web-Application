/*
  Migration 0124 — Business Partner Portal, Phase 1: Foundation Gap

  Partner onboarding (registration -> admin review -> approval) already works
  end-to-end (see 0089/0090/0092). What's missing for an *approved* partner:

    1. partners never received the business/address fields captured on
       partner_applications (gst_number, pan_number, website, address, ...).
    2. No bank details exist anywhere — required before any payout work.
    3. No post-approval document lifecycle (re-upload/verify/reject) — only
       the immutable 5-doc snapshot captured at application time.

  This migration:
    A. Extends partners with the stranded business/address columns + backfill.
    B. Creates partner_bank_accounts (account number never readable via a
       normal SELECT — REVOKEd at the column level — only through the
       audited admin_reveal_partner_bank_account_number() RPC).
    C. Creates partner_documents (normalized, multi-row-per-type history).

  Referrals/commissions/payouts are explicitly out of scope for this
  migration (separate future phases).
*/

-- =========================================================
-- A. EXTEND PARTNERS
-- =========================================================
alter table public.partners
  add column if not exists gst_number                  text,
  add column if not exists pan_number                   text,
  add column if not exists website                      text,
  add column if not exists business_registration_number text,
  add column if not exists address_line_1                text,
  add column if not exists address_line_2                text,
  add column if not exists country                       text default 'India',
  add column if not exists state                          text,
  add column if not exists city                           text,
  add column if not exists district                       text,
  add column if not exists pincode                        text;

alter table public.partners
  drop constraint if exists chk_partners_gst_format;
alter table public.partners
  add constraint chk_partners_gst_format
  check (
    gst_number is null or (
      char_length(gst_number) = 15 and
      gst_number ~ '^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
    )
  )
  not valid;

alter table public.partners
  drop constraint if exists chk_partners_pan_format;
alter table public.partners
  add constraint chk_partners_pan_format
  check (pan_number is null or pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
  not valid;

-- Backfill already-approved partners from their originating application
-- (safe/idempotent — only fills columns that are still null).
update public.partners p
set
  gst_number = a.gst_number,
  pan_number = a.pan_number,
  website = a.website,
  business_registration_number = a.business_registration_number,
  address_line_1 = a.address_line_1,
  address_line_2 = a.address_line_2,
  country = coalesce(a.country, 'India'),
  state = a.state,
  city = a.city,
  district = a.district,
  pincode = a.pincode
from public.partner_applications a
where p.application_id = a.id
  and p.gst_number is null
  and p.pan_number is null
  and p.address_line_1 is null;

-- =========================================================
-- B. PARTNER BANK ACCOUNTS
-- =========================================================
create table if not exists public.partner_bank_accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  partner_id            uuid references public.partners(id) on delete cascade,
  account_holder_name   text not null,
  bank_name             text not null,
  account_number        text not null,
  account_number_last4  text,
  ifsc_code             text not null,
  branch                text,
  account_type          text not null default 'savings' check (account_type in ('savings', 'current')),
  verified              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.partner_bank_accounts
  drop constraint if exists chk_partner_bank_ifsc_format;
alter table public.partner_bank_accounts
  add constraint chk_partner_bank_ifsc_format
  check (ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
  not valid;

create index if not exists idx_partner_bank_accounts_partner_id on public.partner_bank_accounts(partner_id);

alter table public.partner_bank_accounts enable row level security;

drop policy if exists "partner_bank_accounts_select_own" on public.partner_bank_accounts;
create policy "partner_bank_accounts_select_own" on public.partner_bank_accounts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "partner_bank_accounts_insert_own" on public.partner_bank_accounts;
create policy "partner_bank_accounts_insert_own" on public.partner_bank_accounts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "partner_bank_accounts_update_own" on public.partner_bank_accounts;
create policy "partner_bank_accounts_update_own" on public.partner_bank_accounts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "partner_bank_accounts_admin" on public.partner_bank_accounts;
create policy "partner_bank_accounts_admin" on public.partner_bank_accounts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Maintain the masked last-4 automatically so the client never needs the raw column to display it.
create or replace function public.set_partner_bank_account_last4()
returns trigger language plpgsql as $$
begin
  new.account_number_last4 := right(new.account_number, 4);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists partner_bank_accounts_set_last4 on public.partner_bank_accounts;
create trigger partner_bank_accounts_set_last4
  before insert or update on public.partner_bank_accounts
  for each row execute function public.set_partner_bank_account_last4();

-- Column-level privilege: nobody (partner or admin) can read the raw
-- account_number through a normal SELECT/PostgREST query — only the
-- audited reveal RPC below (SECURITY DEFINER, runs as table owner) can.
revoke select (account_number) on public.partner_bank_accounts from authenticated, anon;

create or replace function public.audit_partner_bank_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_log_audit(
    case when tg_op = 'INSERT' then 'partner_bank_account_created' else 'partner_bank_account_updated' end,
    'partner_bank_accounts',
    new.id::text,
    jsonb_build_object('user_id', new.user_id),
    'info',
    null
  );
  if tg_op = 'UPDATE' and old.verified is distinct from new.verified and new.verified then
    perform public.notify_user(
      new.user_id, 'partner_bank',
      'Bank details verified',
      'Your bank account details have been verified by RealtyNow.',
      '/partner/profile'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists partner_bank_accounts_audit on public.partner_bank_accounts;
create trigger partner_bank_accounts_audit
  after insert or update on public.partner_bank_accounts
  for each row execute function public.audit_partner_bank_account();

-- Admin-only, audited full-number reveal. Runs as function owner, so it is
-- unaffected by the REVOKE above; only is_admin() callers may invoke it.
create or replace function public.admin_reveal_partner_bank_account_number(p_bank_account_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select account_number into v_number
  from public.partner_bank_accounts
  where id = p_bank_account_id;

  if v_number is null then
    raise exception 'Bank account not found';
  end if;

  perform public.fn_log_audit(
    'bank_account_number_revealed',
    'partner_bank_accounts',
    p_bank_account_id::text,
    jsonb_build_object('revealed_by', auth.uid()),
    'warning',
    null
  );

  return v_number;
end;
$$;

-- =========================================================
-- C. PARTNER DOCUMENTS (post-approval lifecycle)
-- =========================================================
create table if not exists public.partner_documents (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid references public.partners(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  document_type    text not null check (document_type in (
                     'aadhaar', 'pan', 'govt_id', 'cancelled_cheque', 'bank_proof', 'passbook',
                     'gst_certificate', 'business_registration', 'address_proof', 'other'
                   )),
  storage_path     text not null,
  status           text not null default 'uploaded' check (status in (
                     'uploaded', 'under_review', 'verified', 'rejected', 'resubmission_required'
                   )),
  rejection_reason text,
  reviewed_by      uuid references public.profiles(id),
  reviewed_at      timestamptz,
  uploaded_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_partner_documents_partner_id on public.partner_documents(partner_id);
create index if not exists idx_partner_documents_user_id on public.partner_documents(user_id);
create index if not exists idx_partner_documents_status on public.partner_documents(status);
create index if not exists idx_partner_documents_latest on public.partner_documents(partner_id, document_type, uploaded_at desc);

alter table public.partner_documents enable row level security;

drop policy if exists "partner_documents_select_own" on public.partner_documents;
create policy "partner_documents_select_own" on public.partner_documents
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "partner_documents_insert_own" on public.partner_documents;
create policy "partner_documents_insert_own" on public.partner_documents
  for insert to authenticated with check (auth.uid() = user_id);

-- Deliberately no owner UPDATE policy: status/reviewed_by/rejection_reason
-- are admin-only; a resubmission is a new row, not a mutated one.
drop policy if exists "partner_documents_admin" on public.partner_documents;
create policy "partner_documents_admin" on public.partner_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.notify_and_audit_partner_document_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();

  if old.status is distinct from new.status then
    perform public.fn_log_audit(
      'partner_document_status_changed',
      'partner_documents',
      new.id::text,
      jsonb_build_object('reviewed_by', new.reviewed_by),
      'info',
      jsonb_build_object('status', jsonb_build_object('old', old.status, 'new', new.status))
    );

    if new.status = 'verified' then
      perform public.notify_user(
        new.user_id, 'partner_document', 'Document verified',
        'Your ' || replace(new.document_type, '_', ' ') || ' has been verified.',
        '/partner/profile'
      );
    elsif new.status = 'rejected' then
      perform public.notify_user(
        new.user_id, 'partner_document', 'Document rejected',
        'Your ' || replace(new.document_type, '_', ' ') || ' was rejected.' ||
          case when new.rejection_reason is not null then ' Reason: ' || new.rejection_reason else '' end,
        '/partner/profile'
      );
    elsif new.status = 'resubmission_required' then
      perform public.notify_user(
        new.user_id, 'partner_document', 'Document resubmission required',
        'Please re-upload your ' || replace(new.document_type, '_', ' ') || '.' ||
          case when new.rejection_reason is not null then ' Reason: ' || new.rejection_reason else '' end,
        '/partner/profile'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists partner_documents_status_notify on public.partner_documents;
create trigger partner_documents_status_notify
  before update of status on public.partner_documents
  for each row execute function public.notify_and_audit_partner_document_status();
