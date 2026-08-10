/*
  Adds profile_image to agent_applications so the registration form's
  optional profile photo upload (public profile-images bucket) can be
  displayed in the Admin Agent Applications CRM.
*/
alter table public.agent_applications
  add column if not exists profile_image text;
