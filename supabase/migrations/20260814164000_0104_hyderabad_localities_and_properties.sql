-- Migration: 20260814164000_0104_hyderabad_localities_and_properties.sql
-- Description: Seed Hyderabad localities and demo properties for Explore in Hyderabad section

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Seed Hyderabad localities
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_hyd_city_id UUID;
BEGIN
  SELECT id INTO v_hyd_city_id FROM public.cities WHERE name = 'Hyderabad' LIMIT 1;
  IF v_hyd_city_id IS NULL THEN
    RAISE NOTICE 'Hyderabad city not found – skipping locality seed';
    RETURN;
  END IF;

  INSERT INTO public.localities (city_id, name, pincode) VALUES
    (v_hyd_city_id, 'Jubilee Hills',     '500033'),
    (v_hyd_city_id, 'Banjara Hills',     '500034'),
    (v_hyd_city_id, 'Gachibowli',        '500032'),
    (v_hyd_city_id, 'Hitech City',       '500081'),
    (v_hyd_city_id, 'Madhapur',          '500081'),
    (v_hyd_city_id, 'Kondapur',          '500084'),
    (v_hyd_city_id, 'Kokapet',           '500075'),
    (v_hyd_city_id, 'Financial District','500032'),
    (v_hyd_city_id, 'Begumpet',          '500016'),
    (v_hyd_city_id, 'Kukatpally',        '500072'),
    (v_hyd_city_id, 'Miyapur',           '500049'),
    (v_hyd_city_id, 'Bachupally',        '500090'),
    (v_hyd_city_id, 'Manikonda',         '500089'),
    (v_hyd_city_id, 'Nallagandla',       '500019'),
    (v_hyd_city_id, 'Shamshabad',        '501218'),
    (v_hyd_city_id, 'Attapur',           '500048'),
    (v_hyd_city_id, 'LB Nagar',          '500074'),
    (v_hyd_city_id, 'Secunderabad',      '500003'),
    (v_hyd_city_id, 'Uppal',             '500039'),
    (v_hyd_city_id, 'KPHB Colony',       '500072')
  ON CONFLICT DO NOTHING;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure Hyderabad property_types exist  (Residential Apartment, Villa, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.property_types (name, category) VALUES
  ('Residential Apartment', 'Residential'),
  ('Independent House',     'Residential'),
  ('Villa',                 'Residential'),
  ('Penthouse',             'Residential'),
  ('Office Space',          'Commercial'),
  ('Residential Land',      'Plot')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Seed demo Hyderabad properties
--    All are status='published', is_live=true so they appear in search
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_owner_id       UUID;
  v_agent_id       UUID;
  v_hyd_city_id    UUID;
  -- locality ids
  v_loc_jubilee    UUID;
  v_loc_banjara    UUID;
  v_loc_gachi      UUID;
  v_loc_hitech     UUID;
  v_loc_madhapur   UUID;
  v_loc_kondapur   UUID;
  v_loc_kokapet    UUID;
  v_loc_findistrict UUID;
  v_loc_kukat      UUID;
  v_loc_miyapur    UUID;
  -- property type ids
  v_apt_type_id    UUID;
  v_villa_type_id  UUID;
  v_house_type_id  UUID;
  v_pent_type_id   UUID;
  v_office_type_id UUID;
  v_plot_type_id   UUID;
BEGIN
  -- Get owner (use customer demo or first admin)
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'customer@realtynow.demo' LIMIT 1;
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM public.profiles WHERE role IN ('admin','superadmin') LIMIT 1;
  END IF;
  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'No owner found – skipping Hyderabad property seed';
    RETURN;
  END IF;

  -- Get agent
  SELECT id INTO v_agent_id FROM public.profiles WHERE email = 'agent@realtynow.demo' LIMIT 1;
  IF v_agent_id IS NULL THEN
    v_agent_id := v_owner_id;
  END IF;

  -- Get city
  SELECT id INTO v_hyd_city_id FROM public.cities WHERE name = 'Hyderabad' LIMIT 1;
  IF v_hyd_city_id IS NULL THEN
    RAISE NOTICE 'Hyderabad city not found';
    RETURN;
  END IF;

  -- Get localities
  SELECT id INTO v_loc_jubilee     FROM public.localities WHERE city_id=v_hyd_city_id AND name='Jubilee Hills'      LIMIT 1;
  SELECT id INTO v_loc_banjara     FROM public.localities WHERE city_id=v_hyd_city_id AND name='Banjara Hills'      LIMIT 1;
  SELECT id INTO v_loc_gachi       FROM public.localities WHERE city_id=v_hyd_city_id AND name='Gachibowli'         LIMIT 1;
  SELECT id INTO v_loc_hitech      FROM public.localities WHERE city_id=v_hyd_city_id AND name='Hitech City'        LIMIT 1;
  SELECT id INTO v_loc_madhapur    FROM public.localities WHERE city_id=v_hyd_city_id AND name='Madhapur'           LIMIT 1;
  SELECT id INTO v_loc_kondapur    FROM public.localities WHERE city_id=v_hyd_city_id AND name='Kondapur'           LIMIT 1;
  SELECT id INTO v_loc_kokapet     FROM public.localities WHERE city_id=v_hyd_city_id AND name='Kokapet'            LIMIT 1;
  SELECT id INTO v_loc_findistrict FROM public.localities WHERE city_id=v_hyd_city_id AND name='Financial District' LIMIT 1;
  SELECT id INTO v_loc_kukat       FROM public.localities WHERE city_id=v_hyd_city_id AND name='Kukatpally'         LIMIT 1;
  SELECT id INTO v_loc_miyapur     FROM public.localities WHERE city_id=v_hyd_city_id AND name='Miyapur'            LIMIT 1;

  -- Get property types
  SELECT id INTO v_apt_type_id    FROM public.property_types WHERE name='Residential Apartment' LIMIT 1;
  SELECT id INTO v_villa_type_id  FROM public.property_types WHERE name='Villa'                 LIMIT 1;
  SELECT id INTO v_house_type_id  FROM public.property_types WHERE name='Independent House'     LIMIT 1;
  SELECT id INTO v_pent_type_id   FROM public.property_types WHERE name='Penthouse'             LIMIT 1;
  SELECT id INTO v_office_type_id FROM public.property_types WHERE name='Office Space'          LIMIT 1;
  SELECT id INTO v_plot_type_id   FROM public.property_types WHERE name='Residential Land'      LIMIT 1;

  -- ── Property 1: Jubilee Hills Luxury Villa ──────────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, is_featured, is_luxury, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Luxury 4BHK Villa in Jubilee Hills',
    'Sprawling 4BHK independent villa in one of Hyderabad''s most prestigious localities. Features private pool, landscaped garden, home theatre, and smart home automation. Walking distance from top schools and fine dining.',
    v_villa_type_id, 'Sale', v_hyd_city_id, v_loc_jubilee,
    'Road No. 36, Jubilee Hills, Hyderabad',
    45000000, 4, 4, 2, NULL, NULL,
    4800, 4200, 'Fully Furnished', 3,
    ARRAY['Private Pool','Landscaped Garden','Home Theatre','Smart Home','CCTV','Security','Power Backup'],
    '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg","https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"]'::jsonb,
    'published', true, true, true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- ── Property 2: Banjara Hills Premium Apartment ──────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, is_featured, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Premium 3BHK Apartment in Banjara Hills',
    'Elegant 3BHK apartment in the heart of Banjara Hills with panoramic city views. Fully furnished with modular kitchen, Italian marble flooring, and imported fittings. Gated society with 24/7 security.',
    v_apt_type_id, 'Sale', v_hyd_city_id, v_loc_banjara,
    'Road No. 12, Banjara Hills, Hyderabad',
    18500000, 3, 3, 2, 8, 14,
    2100, 1800, 'Fully Furnished', 2,
    ARRAY['Swimming Pool','Gym','Clubhouse','CCTV','Power Backup','Lift','Security'],
    '["https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg","https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg","https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg"]'::jsonb,
    'published', true, true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- ── Property 3: Gachibowli IT Corridor Apartment ─────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, is_featured, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Modern 2BHK Apartment near Gachibowli IT Hub',
    'Contemporary 2BHK apartment perfect for IT professionals. 10 minutes from Microsoft, Google, and Amazon campuses. Amenities include Olympic pool, cricket net, and co-working lounge.',
    v_apt_type_id, 'Rent', v_hyd_city_id, v_loc_gachi,
    'Gachibowli Main Road, Hyderabad',
    0, 2, 2, 1, 5, 20,
    1300, 1100, 'Semi-Furnished', 1,
    ARRAY['Swimming Pool','Gym','Co-working Space','CCTV','Power Backup','Lift','Security','Wi-Fi'],
    '["https://images.pexels.com/photos/2451260/pexels-photo-2451260.jpeg","https://images.pexels.com/photos/2287310/pexels-photo-2287310.jpeg","https://images.pexels.com/photos/2061728/pexels-photo-2061728.jpeg"]'::jsonb,
    'published', true, false, NOW()
  ) ON CONFLICT DO NOTHING;

  -- Set rent amount for Property 3
  UPDATE public.properties SET rent_amount = 35000, security_deposit = 70000
  WHERE title = 'Modern 2BHK Apartment near Gachibowli IT Hub' AND city_id = v_hyd_city_id;

  -- ── Property 4: Hitech City Penthouse ────────────────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, is_featured, is_luxury, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Ultra-Luxury Penthouse with HITEC City Skyline View',
    'Sky-high penthouse on the 32nd floor with a private rooftop terrace, jacuzzi, and 360° views of HITEC City. Comes with private lift access, smart home automation, and butler service included.',
    v_pent_type_id, 'Sale', v_hyd_city_id, v_loc_hitech,
    'HITEC City Main Road, Madhapur, Hyderabad',
    75000000, 4, 5, 3, 32, 32,
    5500, 4800, 'Fully Furnished', 4,
    ARRAY['Private Rooftop','Jacuzzi','Smart Home','Private Lift','Butler Service','Concierge','Valet Parking','Power Backup'],
    '["https://images.pexels.com/photos/3214064/pexels-photo-3214064.jpeg","https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg","https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg"]'::jsonb,
    'published', true, true, true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- ── Property 5: Madhapur 3BHK for Rent ───────────────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Spacious 3BHK for Rent in Madhapur',
    'Well-maintained 3BHK apartment in prime Madhapur location. Walking distance from metro station. Building with rooftop terrace garden, gym, and children''s play area. No brokerage.',
    v_apt_type_id, 'Rent', v_hyd_city_id, v_loc_madhapur,
    'Cyber Pearl Colony, Madhapur, Hyderabad',
    0, 3, 3, 2, 7, 15,
    1800, 1550, 'Semi-Furnished', 2,
    ARRAY['Rooftop Garden','Gym','Children Play Area','CCTV','Power Backup','Lift','Security'],
    '["https://images.pexels.com/photos/2061728/pexels-photo-2061728.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"]'::jsonb,
    'published', true, NOW()
  ) ON CONFLICT DO NOTHING;

  UPDATE public.properties SET rent_amount=42000, security_deposit=84000
  WHERE title='Spacious 3BHK for Rent in Madhapur' AND city_id=v_hyd_city_id;

  -- ── Property 6: Kondapur 2BHK Apartment for Sale ─────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Affordable 2BHK Apartment for Sale in Kondapur',
    'Move-in ready 2BHK in a well-established society in Kondapur. Close to metro station, schools, and shopping malls. RERA registered project with clear title.',
    v_apt_type_id, 'Sale', v_hyd_city_id, v_loc_kondapur,
    'Kondapur Main Road, Hyderabad',
    8500000, 2, 2, 1, 3, 12,
    1150, 980, 'Semi-Furnished', 1,
    ARRAY['Gym','CCTV','Power Backup','Lift','Security','Children Play Area'],
    '["https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg","https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg"]'::jsonb,
    'published', true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- ── Property 7: Kokapet Luxury Villa ─────────────────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, carpet_area, furnishing, parking, amenities, images,
    status, is_live, is_featured, is_luxury, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Premium 5BHK Villa with Private Pool in Kokapet',
    'Breathtaking villa in Kokapet''s most exclusive gated community. Features private heated pool, home gym, wine cellar, and 3 staff quarters. Located near Nanakramguda financial district and Outer Ring Road.',
    v_villa_type_id, 'Sale', v_hyd_city_id, v_loc_kokapet,
    'Kokapet Gated Township, Hyderabad',
    65000000, 5, 6, 4, NULL, NULL,
    6000, 5200, 'Fully Furnished', 4,
    ARRAY['Private Pool','Home Gym','Wine Cellar','Staff Quarters','Smart Home','CCTV','24x7 Security','Power Backup'],
    '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg","https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg","https://images.pexels.com/photos/3214064/pexels-photo-3214064.jpeg"]'::jsonb,
    'published', true, true, true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- ── Property 8: Financial District Office Space ───────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, built_up_area, parking, amenities, images,
    status, is_live, is_featured, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Grade-A Office Space in Financial District Hyderabad',
    'Premium Grade-A office space with 80 workstations in Hyderabad''s Nanakramguda Financial District. 24/7 power backup, fiber optic internet, dedicated server room, and modern conference halls.',
    v_office_type_id, 'Rent', v_hyd_city_id, v_loc_findistrict,
    'Nanakramguda Financial District, Hyderabad',
    0, 8000, 60,
    ARRAY['24x7 Power Backup','Fiber Internet','Conference Halls','Server Room','Cafeteria','Lift','CCTV','Fire Safety'],
    '["https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg","https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg"]'::jsonb,
    'published', true, true, NOW()
  ) ON CONFLICT DO NOTHING;

  UPDATE public.properties SET rent_amount=4800000, security_deposit=9600000
  WHERE title='Grade-A Office Space in Financial District Hyderabad' AND city_id=v_hyd_city_id;

  -- ── Property 9: Kukatpally Independent House ──────────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, bedrooms, bathrooms, balconies, floor_number, total_floors,
    built_up_area, furnishing, parking, amenities, images,
    status, is_live, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'Independent House G+2 in Kukatpally',
    'Double storey independent house with ground + 2 floors in a prime location. 3 separate flats available (2+2+2 BHK). Ideal for rental income or combined family living. Near JNTU and metro.',
    v_house_type_id, 'Sale', v_hyd_city_id, v_loc_kukat,
    'KPHB Colony, Kukatpally, Hyderabad',
    25000000, 6, 6, 3, NULL, 3,
    3600, 'Unfurnished', 2,
    ARRAY['CCTV','Security','Power Backup'],
    '["https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg","https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg"]'::jsonb,
    'published', true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- ── Property 10: Miyapur Residential Plot ─────────────────────────────────
  INSERT INTO public.properties (
    owner_id, assigned_agent_id, title, description,
    property_type_id, purpose, city_id, locality_id, address,
    price, plot_area, amenities, images,
    status, is_live, published_at
  ) VALUES (
    v_owner_id, v_agent_id,
    'HMDA Approved Plot in Miyapur',
    'HMDA approved 200 sq.yd residential plot in a gated layout in Miyapur. Wide 40-ft road access, compound wall, and underground drainage. Near Miyapur metro station and Chandanagar.',
    v_plot_type_id, 'Sale', v_hyd_city_id, v_loc_miyapur,
    'Miyapur Gated Layout, Hyderabad',
    5500000, 200,
    ARRAY['HMDA Approved','Gated Layout','40ft Road','Underground Drainage','CCTV'],
    '["https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg"]'::jsonb,
    'published', true, NOW()
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Hyderabad localities and properties seeded successfully';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fix "Financial Dist" → ensure locality name matches exactly
--    The home page uses "Financial Dist" in the URL but DB has "Financial District"
--    We add an alias locality so both work
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_hyd_city_id UUID;
BEGIN
  SELECT id INTO v_hyd_city_id FROM public.cities WHERE name = 'Hyderabad' LIMIT 1;
  IF v_hyd_city_id IS NOT NULL THEN
    -- Add short alias so /search?locality=Financial+Dist also resolves
    INSERT INTO public.localities (city_id, name, pincode)
    VALUES (v_hyd_city_id, 'Financial Dist', '500032')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Refresh search view to pick up new properties
-- ─────────────────────────────────────────────────────────────────────────────
-- The view is already defined with security_invoker=true; no action needed.
-- Just ensure is_live=true on all newly seeded properties
UPDATE public.properties
SET is_live = true, status = 'published'
WHERE city_id IN (SELECT id FROM public.cities WHERE name = 'Hyderabad')
  AND status IN ('published', 'live')
  AND (is_live IS NULL OR is_live = false);
