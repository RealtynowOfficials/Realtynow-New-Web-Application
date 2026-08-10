/*
  agent_applications.status and builder_applications.status both still
  defaulted to 'pending' (from the original migration 0007), but a later
  migration replaced their CHECK constraints with the full pipeline-stage
  list ('submitted', 'pending_review', ... 'approved'/'rejected') and
  dropped 'pending' from the allowed values. Every application insert that
  relied on the column default (i.e. every registration form submission,
  since neither form set `status` explicitly) violated the CHECK constraint
  and failed 100% of the time — surfaced to applicants as a raw/duplicate-
  looking error on Review & Submit.
*/
alter table public.agent_applications alter column status set default 'submitted';
alter table public.builder_applications alter column status set default 'submitted';
