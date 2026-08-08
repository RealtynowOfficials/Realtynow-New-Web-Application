alter table public.properties add column if not exists submission_id uuid unique;

create index if not exists idx_properties_submission_id on public.properties(submission_id);
