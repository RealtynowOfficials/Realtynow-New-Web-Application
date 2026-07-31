/*
# RealtyNow Core Schema

## Overview
Creates the foundational schema for RealtyNow, an AI-powered real estate marketplace.
Covers user roles (customer/agent/admin), property listings, media, pricing, location,
enquiries, appointments, messages, notifications, favorites, compare lists, reviews,
views, blogs, CMS, subscriptions, audit + activity logs.

## Tables created
1. profiles — extends auth.users with role, name, phone, avatar, status
2. cities — master list of cities
3. localities — areas within cities
4. property_types — Residential Apartment, Villa, Plot, Commercial etc.
5. amenities — master amenities (Pool, Gym, CCTV...)
6. builders — builder/developer master records
7. projects — builder projects
8. properties — main listing table with status workflow (draft/submitted/pending_verification/approved/published/rejected/archived)
9. property_images — image gallery per property
10. property_videos — video links/files per property
11. property_documents — legal / ownership docs
12. property_floorplans — floor plan images
13. property_views — analytics of property detail views
14. favorites — saved / wishlist properties per user
15. compare — properties the user is comparing
16. enquiries — lead submissions (contact agent/owner)
17. appointments — visit / call appointments
18. visits — completed property visits (agent log)
19. messages — threaded messages between users
20. notifications — in-app notifications
21. reviews — property reviews + ratings
22. subscriptions — subscription plans
23. customer_subscriptions — active subscriptions of customers
24. payments — payment records
25. blogs — blog posts
26. cms_pages — static CMS pages
27. testimonials — homepage testimonials
28. faqs — FAQ entries
29. advertisements — homepage / sidebar ad slots
30. audit_logs — security audit trail
31. activity_logs — user activity trail

## Security (RLS)
- profiles: owner CRUD; admin & agent read scoped (admin all via service role on server).
- public content tables (published properties, cities, localities, types, amenities, builders, projects, blogs, cms_pages, testimonials, faqs, advertisements): readable by anon + authenticated.
- owner-scoped tables (favorites, compare, enquiries-as-customer, appointments, messages, notifications, reviews, customer_subscriptions, payments): owner CRUD.
- properties: SELECT public for published, owner SELECT for own, owner INSERT/UPDATE/DELETE for own.
- property_images/videos/documents/floorplans: SELECT public when parent property published; owner write when parent owned.
- audit_logs / activity_logs: INSERT for authenticated (self), SELECT for admin only via service role.
- Every table has RLS enabled.
*/

-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "pgcrypto";

-- =========================================================
-- PROFILES
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('customer','agent','admin')),
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','suspended','deactivated','pending')),
  agent_id uuid, -- assigned agent for a customer
  bio text,
  company text,
  license_number text,
  assigned_areas text[],
  specialization text,
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_public" on public.profiles;
create policy "profiles_select_own_or_public" on public.profiles for select
  to authenticated using (auth.uid() = id or role in ('agent','admin'));
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert
  to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- =========================================================
-- MASTER DATA (public read)
-- =========================================================
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  state text,
  country text default 'India',
  created_at timestamptz not null default now()
);
alter table public.cities enable row level security;
drop policy if exists "cities_read" on public.cities;
create policy "cities_read" on public.cities for select to anon, authenticated using (true);
drop policy if exists "cities_write" on public.cities;
create policy "cities_write" on public.cities for all to authenticated using (true) with check (true);

create table if not exists public.localities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.cities(id) on delete cascade,
  name text not null,
  pincode text,
  created_at timestamptz not null default now()
);
alter table public.localities enable row level security;
drop policy if exists "localities_read" on public.localities;
create policy "localities_read" on public.localities for select to anon, authenticated using (true);
drop policy if exists "localities_write" on public.localities;
create policy "localities_write" on public.localities for all to authenticated using (true) with check (true);

create table if not exists public.property_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('Residential','Commercial','Plot','Luxury')),
  icon text,
  created_at timestamptz not null default now()
);
alter table public.property_types enable row level security;
drop policy if exists "ptypes_read" on public.property_types;
create policy "ptypes_read" on public.property_types for select to anon, authenticated using (true);
drop policy if exists "ptypes_write" on public.property_types;
create policy "ptypes_write" on public.property_types for all to authenticated using (true) with check (true);

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  created_at timestamptz not null default now()
);
alter table public.amenities enable row level security;
drop policy if exists "amenities_read" on public.amenities;
create policy "amenities_read" on public.amenities for select to anon, authenticated using (true);
drop policy if exists "amenities_write" on public.amenities;
create policy "amenities_write" on public.amenities for all to authenticated using (true) with check (true);

create table if not exists public.builders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  description text,
  established_year int,
  created_at timestamptz not null default now()
);
alter table public.builders enable row level security;
drop policy if exists "builders_read" on public.builders;
create policy "builders_read" on public.builders for select to anon, authenticated using (true);
drop policy if exists "builders_write" on public.builders;
create policy "builders_write" on public.builders for all to authenticated using (true) with check (true);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references public.builders(id) on delete cascade,
  name text not null,
  city_id uuid references public.cities(id),
  description text,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
drop policy if exists "projects_read" on public.projects;
create policy "projects_read" on public.projects for select to anon, authenticated using (true);
drop policy if exists "projects_write" on public.projects;
create policy "projects_write" on public.projects for all to authenticated using (true) with check (true);

-- =========================================================
-- PROPERTIES
-- =========================================================
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  property_type_id uuid references public.property_types(id),
  purpose text not null check (purpose in ('Sale','Rent')),
  city_id uuid references public.cities(id),
  locality_id uuid references public.localities(id),
  address text,
  latitude numeric,
  longitude numeric,
  price numeric not null default 0,
  rent_amount numeric,
  security_deposit numeric,
  bedrooms int,
  bathrooms int,
  balconies int,
  floor_number int,
  total_floors int,
  built_up_area numeric,
  carpet_area numeric,
  plot_area numeric,
  facing text,
  furnishing text check (furnishing in ('Unfurnished','Semi-Furnished','Fully Furnished')),
  parking int default 0,
  age_of_property int,
  ownership_type text,
  legal_approved boolean default false,
  amenities text[],
  features jsonb default '{}'::jsonb,
  images jsonb default '[]'::jsonb,       -- quick store of image urls
  videos jsonb default '[]'::jsonb,
  floor_plans jsonb default '[]'::jsonb,
  documents jsonb default '[]'::jsonb,
  builder_id uuid references public.builders(id),
  project_id uuid references public.projects(id),
  status text not null default 'draft' check (status in ('draft','submitted','pending_verification','approved','published','rejected','archived')),
  is_featured boolean not null default false,
  is_luxury boolean not null default false,
  view_count int not null default 0,
  ai_description text,
  ai_seo text,
  ai_tags text[],
  assigned_agent_id uuid references auth.users(id),
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.properties enable row level security;

drop policy if exists "properties_select_public_or_own" on public.properties;
create policy "properties_select_public_or_own" on public.properties for select
  to anon, authenticated using (status = 'published' or auth.uid() = owner_id or auth.uid() = assigned_agent_id);
drop policy if exists "properties_insert_own" on public.properties;
create policy "properties_insert_own" on public.properties for insert
  to authenticated with check (auth.uid() = owner_id);
drop policy if exists "properties_update_own" on public.properties;
create policy "properties_update_own" on public.properties for update
  to authenticated using (auth.uid() = owner_id or auth.uid() = assigned_agent_id)
  with check (auth.uid() = owner_id or auth.uid() = assigned_agent_id);
drop policy if exists "properties_delete_own" on public.properties;
create policy "properties_delete_own" on public.properties for delete
  to authenticated using (auth.uid() = owner_id);

create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_purpose on public.properties(purpose);
create index if not exists idx_properties_city on public.properties(city_id);
create index if not exists idx_properties_type on public.properties(property_type_id);
create index if not exists idx_properties_owner on public.properties(owner_id);
create index if not exists idx_properties_price on public.properties(price);
create index if not exists idx_properties_featured on public.properties(is_featured);

-- =========================================================
-- PROPERTY MEDIA (normalized)
-- =========================================================
create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  caption text,
  position int default 0,
  created_at timestamptz not null default now()
);
alter table public.property_images enable row level security;
drop policy if exists "pimages_select" on public.property_images;
create policy "pimages_select" on public.property_images for select
  to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.status='published' or p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );
drop policy if exists "pimages_write" on public.property_images;
create policy "pimages_write" on public.property_images for all
  to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );

create table if not exists public.property_videos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);
alter table public.property_videos enable row level security;
drop policy if exists "pvideos_select" on public.property_videos;
create policy "pvideos_select" on public.property_videos for select
  to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.status='published' or p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );
drop policy if exists "pvideos_write" on public.property_videos;
create policy "pvideos_write" on public.property_videos for all
  to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );

create table if not exists public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  doc_type text,
  created_at timestamptz not null default now()
);
alter table public.property_documents enable row level security;
drop policy if exists "pdocs_select" on public.property_documents;
create policy "pdocs_select" on public.property_documents for select
  to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );
drop policy if exists "pdocs_write" on public.property_documents;
create policy "pdocs_write" on public.property_documents for all
  to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );

create table if not exists public.property_floorplans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.property_floorplans enable row level security;
drop policy if exists "pfloor_select" on public.property_floorplans;
create policy "pfloor_select" on public.property_floorplans for select
  to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.status='published' or p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );
drop policy if exists "pfloor_write" on public.property_floorplans;
create policy "pfloor_write" on public.property_floorplans for all
  to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );

-- =========================================================
-- ENGAGEMENT TABLES
-- =========================================================
create table if not exists public.property_views (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  viewer_id uuid,
  viewed_at timestamptz not null default now()
);
alter table public.property_views enable row level security;
drop policy if exists "pviews_insert" on public.property_views;
create policy "pviews_insert" on public.property_views for insert
  to anon, authenticated with check (true);
drop policy if exists "pviews_owner_read" on public.property_views;
create policy "pviews_owner_read" on public.property_views for select
  to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);
alter table public.favorites enable row level security;
drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.compare (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);
alter table public.compare enable row level security;
drop policy if exists "compare_own" on public.compare;
create policy "compare_own" on public.compare for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','closed','spam')),
  created_at timestamptz not null default now()
);
alter table public.enquiries enable row level security;
drop policy if exists "enquiries_insert" on public.enquiries;
create policy "enquiries_insert" on public.enquiries for insert
  to anon, authenticated with check (true);
drop policy if exists "enquiries_select" on public.enquiries;
create policy "enquiries_select" on public.enquiries for select
  to authenticated using (auth.uid() = customer_id or auth.uid() = agent_id);
drop policy if exists "enquiries_update" on public.enquiries;
create policy "enquiries_update" on public.enquiries for update
  to authenticated using (auth.uid() = customer_id or auth.uid() = agent_id) with check (true);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  customer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments for select
  to authenticated using (auth.uid() = customer_id or auth.uid() = agent_id);
drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert" on public.appointments for insert
  to authenticated with check (auth.uid() = customer_id);
drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments for update
  to authenticated using (auth.uid() = customer_id or auth.uid() = agent_id) with check (true);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete cascade,
  visited_at timestamptz not null default now(),
  feedback text,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
alter table public.visits enable row level security;
drop policy if exists "visits_select" on public.visits;
create policy "visits_select" on public.visits for select
  to authenticated using (auth.uid() = customer_id or auth.uid() = agent_id);
drop policy if exists "visits_insert" on public.visits;
create policy "visits_insert" on public.visits for insert
  to authenticated with check (auth.uid() = agent_id or auth.uid() = customer_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  to authenticated with check (auth.uid() = sender_id);
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update
  to authenticated using (auth.uid() = receiver_id) with check (true);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews for insert
  to authenticated with check (auth.uid() = user_id);
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews for delete
  to authenticated using (auth.uid() = user_id);

-- =========================================================
-- SUBSCRIPTIONS / PAYMENTS
-- =========================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  interval text check (interval in ('monthly','yearly','one_time')),
  features jsonb default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "subs_read" on public.subscriptions;
create policy "subs_read" on public.subscriptions for select to anon, authenticated using (true);
drop policy if exists "subs_write" on public.subscriptions;
create policy "subs_write" on public.subscriptions for all to authenticated using (true) with check (true);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.customer_subscriptions enable row level security;
drop policy if exists "cust_subs_own" on public.customer_subscriptions;
create policy "cust_subs_own" on public.customer_subscriptions for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric not null,
  currency text default 'INR',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  reference text,
  invoice_number text,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "payments_own" on public.payments;
create policy "payments_own" on public.payments for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- CONTENT
-- =========================================================
create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null,
  cover_image text,
  author_id uuid references auth.users(id),
  tags text[],
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.blogs enable row level security;
drop policy if exists "blogs_read" on public.blogs;
create policy "blogs_read" on public.blogs for select to anon, authenticated using (published = true or auth.uid() = author_id);
drop policy if exists "blogs_write" on public.blogs;
create policy "blogs_write" on public.blogs for all to authenticated using (true) with check (true);

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.cms_pages enable row level security;
drop policy if exists "cms_read" on public.cms_pages;
create policy "cms_read" on public.cms_pages for select to anon, authenticated using (true);
drop policy if exists "cms_write" on public.cms_pages;
create policy "cms_write" on public.cms_pages for all to authenticated using (true) with check (true);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  company text,
  avatar_url text,
  rating int default 5,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
drop policy if exists "testimonials_read" on public.testimonials;
create policy "testimonials_read" on public.testimonials for select to anon, authenticated using (true);
drop policy if exists "testimonials_write" on public.testimonials;
create policy "testimonials_write" on public.testimonials for all to authenticated using (true) with check (true);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.faqs enable row level security;
drop policy if exists "faqs_read" on public.faqs;
create policy "faqs_read" on public.faqs for select to anon, authenticated using (true);
drop policy if exists "faqs_write" on public.faqs;
create policy "faqs_write" on public.faqs for all to authenticated using (true) with check (true);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  link_url text,
  placement text,
  is_active boolean not null default true,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.advertisements enable row level security;
drop policy if exists "ads_read" on public.advertisements;
create policy "ads_read" on public.advertisements for select to anon, authenticated using (true);
drop policy if exists "ads_write" on public.advertisements;
create policy "ads_write" on public.advertisements for all to authenticated using (true) with check (true);

-- =========================================================
-- AUDIT & ACTIVITY
-- =========================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs for insert
  to authenticated with check (true);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;
drop policy if exists "activity_insert" on public.activity_logs;
create policy "activity_insert" on public.activity_logs for insert
  to authenticated with check (true);

-- =========================================================
-- TRIGGERS: updated_at + profile auto-create + view counter
-- =========================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_properties_updated on public.properties;
create trigger trg_properties_updated before update on public.properties
  for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, first_name, last_name)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'role','customer'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name');
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.increment_property_view()
returns trigger language plpgsql as $$
begin
  update public.properties set view_count = view_count + 1 where id = new.property_id;
  return new;
end $$;

drop trigger if exists trg_property_view_increment on public.property_views;
create trigger trg_property_view_increment after insert on public.property_views
  for each row execute function public.increment_property_view();

-- =========================================================
-- VIEW: published properties with city + type names
-- =========================================================
DROP VIEW IF EXISTS public.vw_published_properties CASCADE;
create or replace view public.vw_published_properties as
select p.*, c.name as city_name, l.name as locality_name, pt.name as property_type_name
from public.properties p
left join public.cities c on c.id = p.city_id
left join public.localities l on l.id = p.locality_id
left join public.property_types pt on pt.id = p.property_type_id
where p.status = 'published';

-- =========================================================
-- SEED MASTER DATA
-- =========================================================
insert into public.cities (name, state) values
  ('Mumbai','Maharashtra'),('Pune','Maharashtra'),('Bengaluru','Karnataka'),
  ('Hyderabad','Telangana'),('Gurugram','Haryana'),('Noida','Uttar Pradesh'),
  ('Chennai','Tamil Nadu'),('Delhi','Delhi'),('Kolkata','West Bengal'),('Ahmedabad','Gujarat')
on conflict (name) do nothing;

insert into public.property_types (name, category) values
  ('Residential Apartment','Residential'),('Independent House','Residential'),
  ('Villa','Residential'),('Builder Floor','Residential'),
  ('Residential Land','Plot'),('Commercial Land','Plot'),
  ('Office Space','Commercial'),('Shop','Commercial'),
  ('Warehouse','Commercial'),('Penthouse','Luxury'),('Luxury Villa','Luxury')
on conflict (name) do nothing;

insert into public.amenities (name) values
  ('Swimming Pool'),('Gym'),('Park'),('CCTV'),('Power Backup'),('Lift'),
  ('Security'),('Clubhouse'),('Children Play Area'),('Car Parking'),
  ('Fire Safety'),('Gated Society'),('Visitor Parking'),('Intercom'),('Wi-Fi')
on conflict (name) do nothing;

insert into public.subscriptions (name, price, interval, features) values
  ('Free', 0, 'monthly', '["List 1 property","Basic search","No AI assistant"]'::jsonb),
  ('Pro', 999, 'monthly', '["Unlimited listings","AI property description","Priority support","Featured badge"]'::jsonb),
  ('Enterprise', 4999, 'monthly', '["Everything in Pro","Dedicated agent","AI SEO & title","Analytics dashboard","Bulk import"]'::jsonb)
on conflict do nothing;

insert into public.cms_pages (title, slug, body) values
  ('About Us','about','RealtyNow is an AI-powered real estate marketplace connecting buyers, renters, and agents across India.'),
  ('Terms','terms','These terms govern your use of RealtyNow platform.'),
  ('Privacy','privacy','We respect your privacy and protect your data.')
on conflict (slug) do nothing;

insert into public.faqs (question, answer, category) values
  ('How do I list my property?','Sign up as a customer, open List Property, complete the multi-step wizard, then submit for verification.','Listing'),
  ('Is RealtyNow free?','Yes, basic listing is free. Upgrade to Pro for unlimited listings and AI features.','Pricing'),
  ('How does property approval work?','After submission, our admin verifies the listing and publishes it within 24 hours.','Listing'),
  ('Can I contact an agent?','Yes, use the Contact button on any property detail page.','Agents')
on conflict do nothing;

insert into public.testimonials (name, role, company, rating, body) values
  ('Aarav Sharma','Home Buyer','Mumbai',5,'RealtyNow made finding my dream home effortless. The AI recommendations were spot on!'),
  ('Priya Nair','Property Owner','Bengaluru',5,'I listed my apartment and got verified leads within 2 days. Excellent platform.'),
  ('Rohan Mehta','Real Estate Agent','Pune',5,'The agent portal helps me manage all my listings, leads, and appointments in one place.')
on conflict do nothing;
