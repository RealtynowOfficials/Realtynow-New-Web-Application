-- Migration 0104 seeded 10 demo properties but reused the same pexels photo
-- IDs (1396122, 2089698) as the cover image for both the Jubilee Hills and
-- Kokapet villa listings, and used 2 pexels IDs already flagged as dead in
-- src/lib/property-images.ts (KNOWN_BROKEN_URLS: 2451260, 2061728) as covers
-- for two other listings. Fixes all rows matching the original seeded
-- image arrays (covers duplicate re-seeded copies of the same title too).

-- Gachibowli apartment: drop 2 broken pexels IDs (2451260, 2061728)
update public.properties
set images = '["https://images.pexels.com/photos/2287310/pexels-photo-2287310.jpeg","https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg","https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg"]'::jsonb
where title = 'Modern 2BHK Apartment near Gachibowli IT Hub'
  and images = '["https://images.pexels.com/photos/2451260/pexels-photo-2451260.jpeg","https://images.pexels.com/photos/2287310/pexels-photo-2287310.jpeg","https://images.pexels.com/photos/2061728/pexels-photo-2061728.jpeg"]'::jsonb;

-- Madhapur 3BHK: drop broken pexels ID (2061728)
update public.properties
set images = '["https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"]'::jsonb
where title = 'Spacious 3BHK for Rent in Madhapur'
  and images = '["https://images.pexels.com/photos/2061728/pexels-photo-2061728.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"]'::jsonb;

-- Kokapet villa: had the identical cover as the Jubilee Hills villa
update public.properties
set images = '["https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg","https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg","https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg"]'::jsonb
where title = 'Premium 5BHK Villa with Private Pool in Kokapet'
  and images = '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg","https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg","https://images.pexels.com/photos/3214064/pexels-photo-3214064.jpeg"]'::jsonb;

-- Miyapur plot: had the identical (only) image as the Kukatpally house listing
update public.properties
set images = '["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"]'::jsonb
where title = 'HMDA Approved Plot in Miyapur'
  and images = '["https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg"]'::jsonb;
