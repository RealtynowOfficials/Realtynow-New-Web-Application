/*
# Admin Properties Policies

Grants admins full access to the properties table so they can view, update, and manage properties in the pending queue.
*/

-- Select
drop policy if exists "admin_select_properties" on public.properties;
create policy "admin_select_properties" on public.properties for select
  to authenticated using (public.is_admin());

-- Update
drop policy if exists "admin_update_properties" on public.properties;
create policy "admin_update_properties" on public.properties for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Delete
drop policy if exists "admin_delete_properties" on public.properties;
create policy "admin_delete_properties" on public.properties for delete
  to authenticated using (public.is_admin());
