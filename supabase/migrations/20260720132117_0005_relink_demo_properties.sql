-- Re-insert demo properties linked to the newly created auth users (by email lookup)
-- The old hardcoded user IDs were removed when recreating users via the auth API.

with
  cu as (select id from public.profiles where email = 'customer@realtynow.demo'),
  au as (select id from public.profiles where email = 'agent@realtynow.demo')

insert into public.properties (
  id, owner_id, assigned_agent_id, title, description, property_type_id, purpose, city_id, locality_id,
  address, price, bedrooms, bathrooms, balconies, floor_number, total_floors,
  built_up_area, carpet_area, furnishing, parking, amenities, images, status,
  is_featured, is_luxury, published_at
)
select
  'a1111111-0000-0000-0000-000000000001'::uuid, cu.id, au.id,
  'Luxury 3BHK Sea-View Apartment in Worli',
  'Spacious 3BHK apartment overlooking the Arabian Sea with premium fittings, modular kitchen, and 2 covered parking slots. Located in a gated society with pool, gym and 24x7 security.',
  pt.id, 'Sale', c.id, l.id, 'Sea Face Road, Worli, Mumbai',
  65000000, 3, 3, 2, 12, 22, 1450, 1200, 'Fully Furnished', 2,
  array['Swimming Pool','Gym','CCTV','Power Backup','Lift','Security','Clubhouse'],
  '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg","https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg"]'::jsonb,
  'published', true, true, now()
from public.cities c, public.localities l, public.property_types pt, cu, au
where c.name='Mumbai' and l.city_id=c.id and l.name='Worli' and pt.name='Residential Apartment'
limit 1
on conflict (id) do nothing;

insert into public.properties (
  id, owner_id, assigned_agent_id, title, description, property_type_id, purpose, city_id, locality_id,
  address, price, bedrooms, bathrooms, floor_number, total_floors,
  built_up_area, furnishing, parking, amenities, images, status, is_featured, published_at
)
select
  'a1111111-0000-0000-0000-000000000002'::uuid, cu.id, au.id,
  'Modern 2BHK in Koramangala',
  'Well-ventilated 2BHK apartment in the heart of Koramangala. Walk to cafes, tech parks and metro.',
  pt.id, 'Sale', c.id, l.id, '5th Block, Koramangala, Bengaluru',
  9500000, 2, 2, 3, 7, 1100, 'Semi-Furnished', 1,
  array['Gym','Lift','Security','CCTV','Car Parking'],
  '["https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg","https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg","https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg"]'::jsonb,
  'published', true, now()
from public.cities c, public.localities l, public.property_types pt,
  (select id from public.profiles where email = 'customer@realtynow.demo') cu,
  (select id from public.profiles where email = 'agent@realtynow.demo') au
where c.name='Bengaluru' and l.city_id=c.id and l.name='Koramangala' and pt.name='Residential Apartment'
limit 1
on conflict (id) do nothing;

insert into public.properties (
  id, owner_id, assigned_agent_id, title, description, property_type_id, purpose, city_id, locality_id,
  address, price, rent_amount, security_deposit, bedrooms, bathrooms, floor_number, total_floors,
  built_up_area, furnishing, parking, amenities, images, status, published_at
)
select
  'a1111111-0000-0000-0000-000000000003'::uuid, cu.id, au.id,
  'Spacious 3BHK Apartment for Rent in Baner',
  'Fully furnished 3BHK with modular kitchen, balcony view, and easy access to Hinjewadi IT park.',
  pt.id, 'Rent', c.id, l.id, 'Baner Road, Pune',
  540000, 45000, 90000, 3, 3, 4, 11, 1500, 'Fully Furnished', 2,
  array['Swimming Pool','Gym','Security','Power Backup','Lift','Children Play Area'],
  '["https://images.pexels.com/photos/2287310/pexels-photo-2287310.jpeg","https://images.pexels.com/photos/2451260/pexels-photo-2451260.jpeg","https://images.pexels.com/photos/2061728/pexels-photo-2061728.jpeg"]'::jsonb,
  'published', now()
from public.cities c, public.localities l, public.property_types pt,
  (select id from public.profiles where email = 'customer@realtynow.demo') cu,
  (select id from public.profiles where email = 'agent@realtynow.demo') au
where c.name='Pune' and l.city_id=c.id and l.name='Baner' and pt.name='Residential Apartment'
limit 1
on conflict (id) do nothing;

insert into public.properties (
  id, owner_id, assigned_agent_id, title, description, property_type_id, purpose, city_id, locality_id,
  address, price, bedrooms, bathrooms, floor_number, total_floors,
  built_up_area, furnishing, parking, amenities, images, status, is_luxury, published_at
)
select
  'a1111111-0000-0000-0000-000000000004'::uuid, cu.id, au.id,
  'Penthouse in Cyber City Gurugram',
  'Ultra-luxury penthouse with private terrace, jacuzzi, and panoramic city views.',
  pt.id, 'Sale', c.id, l.id, 'Cyber City, Gurugram',
  85000000, 4, 4, 21, 21, 3200, 'Fully Furnished', 3,
  array['Swimming Pool','Gym','CCTV','Power Backup','Lift','Security','Clubhouse','Fire Safety'],
  '["https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg","https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg","https://images.pexels.com/photos/3214064/pexels-photo-3214064.jpeg"]'::jsonb,
  'published', true, now()
from public.cities c, public.localities l, public.property_types pt,
  (select id from public.profiles where email = 'customer@realtynow.demo') cu,
  (select id from public.profiles where email = 'agent@realtynow.demo') au
where c.name='Gurugram' and l.city_id=c.id and l.name='Cyber City' and pt.name='Penthouse'
limit 1
on conflict (id) do nothing;

insert into public.properties (
  id, owner_id, assigned_agent_id, title, description, property_type_id, purpose, city_id, locality_id,
  address, price, built_up_area, parking, amenities, images, status, published_at
)
select
  'a1111111-0000-0000-0000-000000000005'::uuid, cu.id, au.id,
  'Premium Office Space in Cyber City',
  'Grade-A office space with 50 workstations, conference rooms, and 24x7 power backup.',
  pt.id, 'Rent', c.id, l.id, 'Cyber City, Gurugram',
  2640000, 5000, 40,
  array['Power Backup','Lift','Security','CCTV','Fire Safety','Wi-Fi'],
  '["https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg","https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg"]'::jsonb,
  'published', now()
from public.cities c, public.localities l, public.property_types pt,
  (select id from public.profiles where email = 'customer@realtynow.demo') cu,
  (select id from public.profiles where email = 'agent@realtynow.demo') au
where c.name='Gurugram' and l.city_id=c.id and l.name='Cyber City' and pt.name='Office Space'
limit 1
on conflict (id) do nothing;

insert into public.properties (
  id, owner_id, assigned_agent_id, title, description, property_type_id, purpose, city_id, locality_id,
  address, price, plot_area, amenities, images, status, published_at
)
select
  'a1111111-0000-0000-0000-000000000006'::uuid, cu.id, au.id,
  'Residential Plot in Baner',
  '2000 sq ft corner plot in gated layout, ready for construction with clear title.',
  pt.id, 'Sale', c.id, l.id, 'Baner, Pune',
  6000000, 2000,
  array['Gated Society','Security','CCTV'],
  '["https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg"]'::jsonb,
  'published', now()
from public.cities c, public.localities l, public.property_types pt,
  (select id from public.profiles where email = 'customer@realtynow.demo') cu,
  (select id from public.profiles where email = 'agent@realtynow.demo') au
where c.name='Pune' and l.city_id=c.id and l.name='Baner' and pt.name='Residential Land'
limit 1
on conflict (id) do nothing;
