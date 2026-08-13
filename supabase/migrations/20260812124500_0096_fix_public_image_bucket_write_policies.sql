/*
  Security fix: four public-read image buckets had write policies that were
  either anonymous (migration 0068's public_insert_*/public_update_*
  policies, TO anon,authenticated with only a bucket_id check) or, even for
  the authenticated-only ones from migration 0004, had no owner check at
  all. Net effect:
    - Any unauthenticated visitor could overwrite an existing object in
      property-images/profile-images (defacement — replace someone else's
      listing/profile photo with arbitrary content).
    - Any unauthenticated visitor could insert new files into
      blog-images/advertisements, both of which are actually admin-managed
      content (verified: every uploader in src/ for these two buckets lives
      under src/pages/admin/*), not user-generated.
    - Any logged-in user (not just the owner) could overwrite another
      user's property/profile image, since the authenticated UPDATE
      policies were bucket-scoped only.

  Fix: property-images/profile-images keep public SELECT + authenticated
  INSERT (bucket-scoped — Storage sets `owner` from the session
  automatically, nothing meaningful to check pre-insert), but UPDATE/DELETE
  become owner-or-admin scoped. blog-images/advertisements become
  admin-only for INSERT/UPDATE/DELETE (SELECT stays public, unchanged).
*/

-- Drop the anonymous-writable policies from migration 0068.
drop policy if exists "public_insert_profile_images" on storage.objects;
drop policy if exists "public_update_profile_images" on storage.objects;
drop policy if exists "public_insert_property_images" on storage.objects;
drop policy if exists "public_update_property_images" on storage.objects;
drop policy if exists "public_insert_blog_images" on storage.objects;
drop policy if exists "public_insert_advertisements" on storage.objects;

-- property-images: owner-or-admin scoped update/delete.
drop policy if exists "auth_update_property_images" on storage.objects;
create policy "auth_update_property_images" on storage.objects for update
  to authenticated
  using (bucket_id = 'property-images' and (auth.uid() = owner or public.is_admin()))
  with check (bucket_id = 'property-images' and (auth.uid() = owner or public.is_admin()));

drop policy if exists "auth_delete_property_images" on storage.objects;
create policy "auth_delete_property_images" on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-images' and (auth.uid() = owner or public.is_admin()));

-- profile-images: owner-or-admin scoped update; add delete (previously
-- missing entirely, so nobody could clean up an old avatar).
drop policy if exists "auth_update_profile_images" on storage.objects;
create policy "auth_update_profile_images" on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-images' and (auth.uid() = owner or public.is_admin()))
  with check (bucket_id = 'profile-images' and (auth.uid() = owner or public.is_admin()));

drop policy if exists "auth_delete_profile_images" on storage.objects;
create policy "auth_delete_profile_images" on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-images' and (auth.uid() = owner or public.is_admin()));

-- blog-images / advertisements: admin-managed content, not user-generated —
-- restrict all writes to admins.
drop policy if exists "auth_upload_blog_images" on storage.objects;
create policy "admin_insert_blog_images" on storage.objects for insert
  to authenticated with check (bucket_id = 'blog-images' and public.is_admin());
create policy "admin_update_blog_images" on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());
create policy "admin_delete_blog_images" on storage.objects for delete
  to authenticated using (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "auth_upload_advertisements" on storage.objects;
create policy "admin_insert_advertisements" on storage.objects for insert
  to authenticated with check (bucket_id = 'advertisements' and public.is_admin());
create policy "admin_update_advertisements" on storage.objects for update
  to authenticated
  using (bucket_id = 'advertisements' and public.is_admin())
  with check (bucket_id = 'advertisements' and public.is_admin());
create policy "admin_delete_advertisements" on storage.objects for delete
  to authenticated using (bucket_id = 'advertisements' and public.is_admin());
