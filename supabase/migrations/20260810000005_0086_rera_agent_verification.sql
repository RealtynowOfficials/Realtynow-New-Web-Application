/*
  RERA verification workflow for agents. `profiles.license_number` already
  stores the RERA/license number entered at registration — this adds the
  fields needed to track a separate admin verification decision on it, so the
  public agent profile can only show "RERA Certified Agent" once an admin has
  actually verified the number/document (not merely because the agent typed one in).
*/
alter table public.profiles
  add column if not exists rera_document_url text,
  add column if not exists rera_verified boolean not null default false,
  add column if not exists rera_verification_status text not null default 'not_submitted'
    check (rera_verification_status in ('not_submitted', 'pending', 'under_review', 'verified', 'rejected')),
  add column if not exists rera_verified_at timestamptz,
  add column if not exists rera_verified_by uuid references public.profiles(id),
  add column if not exists rera_rejection_reason text;
