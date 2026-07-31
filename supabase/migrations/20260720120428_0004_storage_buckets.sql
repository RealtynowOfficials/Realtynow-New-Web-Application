/*
# Storage buckets
Creates the 9 storage buckets used by RealtyNow. Public read for property/profile/blog images;
authenticated upload. Buckets are idempotent via insert-or-nothing on storage.buckets.
*/
insert into storage.buckets (id, name, public)
values
  ('property-images','property-images', true),
  ('property-videos','property-videos', true),
  ('property-documents','property-documents', false),
  ('agent-documents','agent-documents', false),
  ('customer-documents','customer-documents', false),
  ('profile-images','profile-images', true),
  ('blog-images','blog-images', true),
  ('advertisements','advertisements', true),
  ('company-assets','company-assets', false)
on conflict (id) do nothing;

-- Public read policies for public buckets
drop policy if exists "public_read_property_images" on storage.objects;
create policy "public_read_property_images" on storage.objects for select
  to anon, authenticated using (bucket_id = 'property-images');

drop policy if exists "auth_upload_property_images" on storage.objects;
create policy "auth_upload_property_images" on storage.objects for insert
  to authenticated with check (bucket_id = 'property-images');

drop policy if exists "auth_update_property_images" on storage.objects;
create policy "auth_update_property_images" on storage.objects for update
  to authenticated using (bucket_id = 'property-images');

drop policy if exists "auth_delete_property_images" on storage.objects;
create policy "auth_delete_property_images" on storage.objects for delete
  to authenticated using (bucket_id = 'property-images');

drop policy if exists "public_read_profile_images" on storage.objects;
create policy "public_read_profile_images" on storage.objects for select
  to anon, authenticated using (bucket_id = 'profile-images');

drop policy if exists "auth_upload_profile_images" on storage.objects;
create policy "auth_upload_profile_images" on storage.objects for insert
  to authenticated with check (bucket_id = 'profile-images');

drop policy if exists "auth_update_profile_images" on storage.objects;
create policy "auth_update_profile_images" on storage.objects for update
  to authenticated using (bucket_id = 'profile-images');

drop policy if exists "public_read_blog_images" on storage.objects;
create policy "public_read_blog_images" on storage.objects for select
  to anon, authenticated using (bucket_id = 'blog-images');

drop policy if exists "auth_upload_blog_images" on storage.objects;
create policy "auth_upload_blog_images" on storage.objects for insert
  to authenticated with check (bucket_id = 'blog-images');

drop policy if exists "public_read_advertisements" on storage.objects;
create policy "public_read_advertisements" on storage.objects for select
  to anon, authenticated using (bucket_id = 'advertisements');

drop policy if exists "auth_upload_advertisements" on storage.objects;
create policy "auth_upload_advertisements" on storage.objects for insert
  to authenticated with check (bucket_id = 'advertisements');

-- authenticated CRUD for the rest
drop policy if exists "auth_rw_property_videos" on storage.objects;
create policy "auth_rw_property_videos" on storage.objects for all
  to authenticated using (bucket_id = 'property-videos') with check (bucket_id = 'property-videos');

drop policy if exists "auth_rw_property_documents" on storage.objects;
create policy "auth_rw_property_documents" on storage.objects for all
  to authenticated using (bucket_id = 'property-documents') with check (bucket_id = 'property-documents');

drop policy if exists "auth_rw_agent_documents" on storage.objects;
create policy "auth_rw_agent_documents" on storage.objects for all
  to authenticated using (bucket_id = 'agent-documents') with check (bucket_id = 'agent-documents');

drop policy if exists "auth_rw_customer_documents" on storage.objects;
create policy "auth_rw_customer_documents" on storage.objects for all
  to authenticated using (bucket_id = 'customer-documents') with check (bucket_id = 'customer-documents');

drop policy if exists "auth_rw_company_assets" on storage.objects;
create policy "auth_rw_company_assets" on storage.objects for all
  to authenticated using (bucket_id = 'company-assets') with check (bucket_id = 'company-assets');
