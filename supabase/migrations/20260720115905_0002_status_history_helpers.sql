/*
# Property status history + admin helper RPC + localities
No sample properties yet (those need real auth.users, added after seeding demo accounts).
*/

create table if not exists public.property_status_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.property_status_history enable row level security;
drop policy if exists "pstatus_select" on public.property_status_history;
create policy "pstatus_select" on public.property_status_history for select
  to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.assigned_agent_id = auth.uid()))
  );
drop policy if exists "pstatus_insert" on public.property_status_history;
create policy "pstatus_insert" on public.property_status_history for insert
  to authenticated with check (true);

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_agent()
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'agent');
$$;

insert into public.localities (city_id, name, pincode)
select id, 'Worli', '400018' from public.cities where name='Mumbai'
on conflict do nothing;
insert into public.localities (city_id, name, pincode)
select id, 'Koramangala', '560034' from public.cities where name='Bengaluru'
on conflict do nothing;
insert into public.localities (city_id, name, pincode)
select id, 'Baner', '411045' from public.cities where name='Pune'
on conflict do nothing;
insert into public.localities (city_id, name, pincode)
select id, 'Cyber City', '122002' from public.cities where name='Gurugram'
on conflict do nothing;

insert into public.blogs (title, slug, excerpt, body, cover_image, tags, published, published_at)
values
  ('Mumbai Real Estate Trends 2026','mumbai-real-estate-trends-2026',
   'An in-depth look at property prices and emerging micro-markets in Mumbai.',
   'Mumbai remains one of India''s most resilient real estate markets. In 2026, we expect Worli, Lower Parel and Wadala to see renewed demand driven by infrastructure upgrades.',
   'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg',
   array['Mumbai','Trends','Investment'], true, now()),
  ('How AI is Changing Property Search','ai-property-search',
   'How AI-powered recommendations help buyers find their perfect home faster.',
   'AI assistants now read buyer intent and surface relevant listings, saving hours of manual search.',
   'https://images.pexels.com/photos/7437489/pexels-photo-7437489.jpeg',
   array['AI','Technology'], true, now())
on conflict (slug) do nothing;
