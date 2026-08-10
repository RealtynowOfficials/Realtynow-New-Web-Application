/*
  Extends `builders` (previously a bare id/name/logo_url/description lookup table)
  with the fields needed to connect it to the real approval pipeline and drive the
  homepage "Verified Builders" carousel:

    - user_id / contact_* : links a builders row to the builder's profiles account
      (process-application currently tries to insert these on approval but they
      don't exist yet, so builder approval silently fails to create this row)
    - status               : gates public visibility to admin-approved builders only
    - cover_image, city_id, locality_id : carousel/profile card content
    - is_featured, display_order, public_visible : admin controls for carousel ordering
*/
alter table public.builders
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists cover_image text,
  add column if not exists city_id uuid references public.cities(id),
  add column if not exists locality_id uuid references public.localities(id),
  add column if not exists status text not null default 'approved' check (status in ('pending','approved','rejected')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists display_order int not null default 0,
  add column if not exists public_visible boolean not null default true;

create index if not exists idx_builders_user_id on public.builders(user_id);
create unique index if not exists idx_builders_user_id_unique on public.builders(user_id) where user_id is not null;
create index if not exists idx_builders_public_listing on public.builders(status, public_visible, is_featured, display_order);
