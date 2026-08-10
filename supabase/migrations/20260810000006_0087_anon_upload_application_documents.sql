/*
  Agent/builder registration is submitted by anonymous visitors who don't
  have an account yet (agent_applications/builder_applications already allow
  anon INSERT for this reason — see migration 0007). But the storage policies
  for the document buckets those forms upload into (Govt ID, RERA/GST/PAN
  docs) only granted `authenticated` INSERT, so the anon-key upload call was
  silently rejected by RLS ("new row violates row-level security policy"),
  surfacing as a raw error on the Review & Submit step and blocking
  submission entirely.

  Adds anon INSERT-only policies scoped to these two buckets. Read/update/
  delete remain authenticated-only (existing auth_rw_* policies) — an
  applicant can upload their own document but never list, read, or modify
  anyone else's.
*/
drop policy if exists "anon_insert_agent_documents" on storage.objects;
create policy "anon_insert_agent_documents" on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'agent-documents');

drop policy if exists "anon_insert_builder_documents" on storage.objects;
create policy "anon_insert_builder_documents" on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'builder-documents');
