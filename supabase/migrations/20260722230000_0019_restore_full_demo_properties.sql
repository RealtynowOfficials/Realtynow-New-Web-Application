-- Migration: 20260722230000_0019_restore_full_demo_properties.sql
-- Description: Restore and guarantee all demo real-estate properties in public.properties without missing records.

-- Update purpose check constraint to ensure all valid purposes including Commercial are allowed
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_purpose_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_purpose_check 
  CHECK (purpose IN ('Sale','Rent','Lease','PG','CoLiving','Hostel','Short Stay','Vacation Rental','Commercial'));

DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  
  IF v_owner_id IS NULL THEN
    v_owner_id := gen_random_uuid();
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (v_owner_id, 'admin@realtynow.demo', 'System', 'Admin', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.properties (
    id, owner_id, title, description, purpose, price, bedrooms, bathrooms, address,
    status, is_featured, is_luxury, images, created_at
  ) VALUES
  (
    'a1111111-0000-0000-0000-000000000001'::uuid, v_owner_id,
    'Luxury 3BHK Sea-View Apartment in Worli',
    'Spacious 3BHK apartment overlooking the Arabian Sea with premium fittings, modular kitchen, and 2 covered parking slots.',
    'Sale', 65000000, 3, 3, 'Sea Face Road, Worli, Mumbai',
    'published', true, true,
    '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000002'::uuid, v_owner_id,
    'Modern 2BHK in Koramangala',
    'Well-ventilated 2BHK apartment in the heart of Koramangala. Walk to cafes, tech parks and metro.',
    'Sale', 9500000, 2, 2, '5th Block, Koramangala, Bengaluru',
    'published', true, false,
    '["https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg","https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000003'::uuid, v_owner_id,
    'Spacious 3BHK Apartment for Rent in Baner',
    'Fully furnished 3BHK with modular kitchen, balcony view, and easy access to Hinjewadi IT park.',
    'Rent', 540000, 3, 3, 'Baner Road, Pune',
    'published', false, false,
    '["https://images.pexels.com/photos/2287310/pexels-photo-2287310.jpeg","https://images.pexels.com/photos/2451260/pexels-photo-2451260.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000004'::uuid, v_owner_id,
    'Ultra-Luxury Penthouse in Cyber City Gurugram',
    'Ultra-luxury penthouse with private terrace, jacuzzi, and panoramic city views.',
    'Sale', 85000000, 4, 4, 'Cyber City, Gurugram',
    'published', true, true,
    '["https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg","https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000005'::uuid, v_owner_id,
    'Grade-A Commercial Office Space in Cyber City',
    'Grade-A office space with 50 workstations, conference rooms, and 24x7 power backup.',
    'Commercial', 2640000, 0, 4, 'Cyber City, Gurugram',
    'published', false, false,
    '["https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg","https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000006'::uuid, v_owner_id,
    'Prime Corner Residential Plot in Baner',
    '2000 sq ft corner plot in gated layout, ready for construction with clear title.',
    'Sale', 6000000, 0, 0, 'Baner, Pune',
    'published', false, false,
    '["https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000007'::uuid, v_owner_id,
    'DLF The Camellias Luxury Penthouse',
    'Ultra-luxurious 4 BHK penthouse with Golf Course views, private elevator, and smart automation.',
    'Sale', 35000000, 4, 5, 'Golf Course Road, Sector 42, Gurugram',
    'pending_verification', true, true,
    '["https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg"]'::jsonb,
    now()
  ),
  (
    'a1111111-0000-0000-0000-000000000008'::uuid, v_owner_id,
    'Prestige Lakeside Habitat Villa',
    'Contemporary 3 BHK independent villa with private garden, swimming pool, and solar power.',
    'Sale', 28000000, 3, 4, 'Varthur Main Road, Whitefield, Bengaluru',
    'submitted', true, true,
    '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg"]'::jsonb,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    purpose = EXCLUDED.purpose,
    price = EXCLUDED.price,
    bedrooms = EXCLUDED.bedrooms,
    bathrooms = EXCLUDED.bathrooms,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    is_luxury = EXCLUDED.is_luxury,
    images = EXCLUDED.images;
END $$;
