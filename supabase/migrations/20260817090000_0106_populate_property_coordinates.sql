-- Migration: 20260817090000_0106_populate_property_coordinates.sql
-- Description: Populate real-world latitude and longitude coordinates for all properties and localities.

-- 1. Ensure localities have proper default coordinates if columns exist or update them
DO $$
BEGIN
  -- Add latitude and longitude to localities if not already existing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'localities' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.localities ADD COLUMN latitude numeric(10, 6);
    ALTER TABLE public.localities ADD COLUMN longitude numeric(10, 6);
  END IF;
END $$;

-- 2. Update Hyderabad locality coordinates
UPDATE public.localities SET latitude = 17.4319, longitude = 78.4073 WHERE name ILIKE '%Jubilee Hills%';
UPDATE public.localities SET latitude = 17.4156, longitude = 78.4350 WHERE name ILIKE '%Banjara Hills%';
UPDATE public.localities SET latitude = 17.4401, longitude = 78.3489 WHERE name ILIKE '%Gachibowli%';
UPDATE public.localities SET latitude = 17.4435, longitude = 78.3772 WHERE name ILIKE '%Hitech City%' OR name ILIKE '%HITEC City%';
UPDATE public.localities SET latitude = 17.4483, longitude = 78.3915 WHERE name ILIKE '%Madhapur%';
UPDATE public.localities SET latitude = 17.4699, longitude = 78.3578 WHERE name ILIKE '%Kondapur%';
UPDATE public.localities SET latitude = 17.3976, longitude = 78.3328 WHERE name ILIKE '%Kokapet%';
UPDATE public.localities SET latitude = 17.4168, longitude = 78.3456 WHERE name ILIKE '%Financial District%';
UPDATE public.localities SET latitude = 17.4184, longitude = 78.3496 WHERE name ILIKE '%Nanakramguda%';
UPDATE public.localities SET latitude = 17.4048, longitude = 78.3694 WHERE name ILIKE '%Puppalguda%';
UPDATE public.localities SET latitude = 17.3984, longitude = 78.3846 WHERE name ILIKE '%Manikonda%';
UPDATE public.localities SET latitude = 17.4727, longitude = 78.3094 WHERE name ILIKE '%Nallagandla%';
UPDATE public.localities SET latitude = 17.4582, longitude = 78.2869 WHERE name ILIKE '%Tellapur%';
UPDATE public.localities SET latitude = 17.4849, longitude = 78.4138 WHERE name ILIKE '%Kukatpally%';
UPDATE public.localities SET latitude = 17.4933, longitude = 78.3999 WHERE name ILIKE '%KPHB%';
UPDATE public.localities SET latitude = 17.4969, longitude = 78.3547 WHERE name ILIKE '%Miyapur%';
UPDATE public.localities SET latitude = 17.5342, longitude = 78.3664 WHERE name ILIKE '%Bachupally%';
UPDATE public.localities SET latitude = 17.4447, longitude = 78.4664 WHERE name ILIKE '%Begumpet%';
UPDATE public.localities SET latitude = 17.4375, longitude = 78.4482 WHERE name ILIKE '%Ameerpet%';
UPDATE public.localities SET latitude = 17.4399, longitude = 78.4983 WHERE name ILIKE '%Secunderabad%';
UPDATE public.localities SET latitude = 17.4018, longitude = 78.5602 WHERE name ILIKE '%Uppal%';
UPDATE public.localities SET latitude = 17.3457, longitude = 78.5522 WHERE name ILIKE '%LB Nagar%' OR name ILIKE '%L.B. Nagar%';
UPDATE public.localities SET latitude = 17.3688, longitude = 78.4239 WHERE name ILIKE '%Attapur%';
UPDATE public.localities SET latitude = 17.2403, longitude = 78.4294 WHERE name ILIKE '%Shamshabad%';

-- 3. Populate genuine coordinates on properties from their locality or address
UPDATE public.properties p
SET 
  latitude = l.latitude,
  longitude = l.longitude
FROM public.localities l
WHERE p.locality_id = l.id
  AND (p.latitude IS NULL OR p.longitude IS NULL OR p.latitude = 0 OR p.longitude = 0)
  AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL;

-- 4. Address-based coordinate updates for properties without locality_id
UPDATE public.properties SET latitude = 17.4319, longitude = 78.4073 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Jubilee Hills%' OR title ILIKE '%Jubilee Hills%');
UPDATE public.properties SET latitude = 17.4156, longitude = 78.4350 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Banjara Hills%' OR title ILIKE '%Banjara Hills%');
UPDATE public.properties SET latitude = 17.4401, longitude = 78.3489 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Gachibowli%' OR title ILIKE '%Gachibowli%');
UPDATE public.properties SET latitude = 17.4435, longitude = 78.3772 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Hitech City%' OR title ILIKE '%Hitech City%' OR address ILIKE '%HITEC%');
UPDATE public.properties SET latitude = 17.4483, longitude = 78.3915 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Madhapur%' OR title ILIKE '%Madhapur%');
UPDATE public.properties SET latitude = 17.4699, longitude = 78.3578 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Kondapur%' OR title ILIKE '%Kondapur%');
UPDATE public.properties SET latitude = 17.3976, longitude = 78.3328 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Kokapet%' OR title ILIKE '%Kokapet%');
UPDATE public.properties SET latitude = 17.4168, longitude = 78.3456 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Financial District%' OR title ILIKE '%Financial District%');
UPDATE public.properties SET latitude = 17.4849, longitude = 78.4138 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Kukatpally%' OR title ILIKE '%Kukatpally%');
UPDATE public.properties SET latitude = 17.4969, longitude = 78.3547 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Miyapur%' OR title ILIKE '%Miyapur%');
UPDATE public.properties SET latitude = 17.5342, longitude = 78.3664 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Bachupally%' OR title ILIKE '%Bachupally%');
UPDATE public.properties SET latitude = 17.3984, longitude = 78.3846 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Manikonda%' OR title ILIKE '%Manikonda%');
UPDATE public.properties SET latitude = 17.4727, longitude = 78.3094 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Nallagandla%' OR title ILIKE '%Nallagandla%');
UPDATE public.properties SET latitude = 17.2403, longitude = 78.4294 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Shamshabad%' OR title ILIKE '%Shamshabad%');
UPDATE public.properties SET latitude = 17.3688, longitude = 78.4239 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Attapur%' OR title ILIKE '%Attapur%');
UPDATE public.properties SET latitude = 17.3457, longitude = 78.5522 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%LB Nagar%' OR title ILIKE '%LB Nagar%');
UPDATE public.properties SET latitude = 17.4399, longitude = 78.4983 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Secunderabad%' OR title ILIKE '%Secunderabad%');
UPDATE public.properties SET latitude = 17.4018, longitude = 78.5602 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Uppal%' OR title ILIKE '%Uppal%');
UPDATE public.properties SET latitude = 17.4933, longitude = 78.3999 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%KPHB%' OR title ILIKE '%KPHB%');

-- Other cities demo properties
UPDATE public.properties SET latitude = 18.9986, longitude = 72.8174 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Worli%' OR address ILIKE '%Mumbai%');
UPDATE public.properties SET latitude = 12.9352, longitude = 77.6245 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Koramangala%' OR address ILIKE '%Bengaluru%' OR address ILIKE '%Bangalore%');
UPDATE public.properties SET latitude = 18.5590, longitude = 73.7868 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Baner%' OR address ILIKE '%Pune%');
UPDATE public.properties SET latitude = 28.4950, longitude = 77.0895 WHERE (latitude IS NULL OR latitude = 0) AND (address ILIKE '%Cyber City%' OR address ILIKE '%Gurugram%' OR address ILIKE '%Gurgaon%');

-- 5. Fallback for any remaining properties in Hyderabad: center around city with slight scatter
UPDATE public.properties
SET 
  latitude = 17.3850 + ((('x' || substr(md5(id::text), 1, 4))::bit(16)::int % 800) - 400) * 0.0001,
  longitude = 78.4867 + ((('x' || substr(md5(id::text), 5, 4))::bit(16)::int % 800) - 400) * 0.0001
WHERE latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0;
