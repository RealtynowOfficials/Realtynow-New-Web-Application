/*
  Security fix: 6 storage buckets that hold private/KYC-grade documents
  (agent-documents, customer-documents, property-documents, company-assets,
  bulk-import-files, builder-documents) were policied as
  `FOR ALL TO authenticated USING (bucket_id = 'X')` — i.e. bucket-scoped
  only, with no ownership check at all. Any logged-in user (any customer,
  any agent) could list, download, replace, or delete ANY other user's
  uploaded document in these buckets, despite comments elsewhere in the
  migration history explicitly claiming otherwise.

  Fix: split each "FOR ALL" policy into SELECT/UPDATE/DELETE scoped to
  `auth.uid() = owner OR is_admin()`. INSERT stays bucket-scoped only
  (unchanged) — Storage sets `owner` from the uploader's session
  automatically, so there's nothing meaningful to check pre-insert, and the
  existing anon-insert policies for agent/builder application uploads
  (migration 0087) are intentionally anonymous (no owner yet, no account
  exists until admin approval) and are left untouched. Anonymously-uploaded
  documents (owner IS NULL) become admin-only readable, which matches how
  they're actually already reviewed today — through service-role edge
  functions (admin-agent-verification, ApplicationReviewDrawer) that bypass
  RLS entirely, not direct client reads.
*/

do $$
declare
  b text;
begin
  foreach b in array array['property-documents','agent-documents','customer-documents','company-assets','bulk-import-files','builder-documents']
  loop
    execute format('drop policy if exists %I on storage.objects', 'auth_rw_' || replace(b, '-', '_'));

    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and (auth.uid() = owner or public.is_admin()))',
      'owner_select_' || replace(b, '-', '_'), b
    );
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (auth.uid() = owner or public.is_admin())) with check (bucket_id = %L and (auth.uid() = owner or public.is_admin()))',
      'owner_update_' || replace(b, '-', '_'), b, b
    );
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (auth.uid() = owner or public.is_admin()))',
      'owner_delete_' || replace(b, '-', '_'), b
    );
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L)',
      'auth_insert_' || replace(b, '-', '_'), b
    );
  end loop;
end $$;
