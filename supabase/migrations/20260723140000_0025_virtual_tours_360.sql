-- Migration 0025: 360° Virtual Property Tour Schema, Analytics & Storage Bucket

-- 1. Create property_virtual_tours table
CREATE TABLE IF NOT EXISTS public.property_virtual_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL DEFAULT 'Living Room',
  title TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INT DEFAULT 0,
  is_cover BOOLEAN DEFAULT FALSE,
  floor_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_virtual_tours_property_id ON public.property_virtual_tours(property_id);
CREATE INDEX IF NOT EXISTS idx_property_virtual_tours_sort ON public.property_virtual_tours(property_id, sort_order);

-- 2. Add 360 tour metadata columns to properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS has_virtual_tour BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS virtual_tour_cover TEXT,
  ADD COLUMN IF NOT EXISTS virtual_tour_count INT DEFAULT 0;

-- 3. Create virtual_tour_analytics table
CREATE TABLE IF NOT EXISTS public.virtual_tour_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.property_virtual_tours(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  view_duration_seconds INT DEFAULT 0,
  room_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_virtual_tour_analytics_property_id ON public.virtual_tour_analytics(property_id);

-- 4. Automatic sync trigger to update properties.has_virtual_tour, virtual_tour_count & virtual_tour_cover
CREATE OR REPLACE FUNCTION public.sync_property_virtual_tour_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_property_id UUID;
  cnt INT;
  cover_url TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_property_id := OLD.property_id;
  ELSE
    target_property_id := NEW.property_id;
  END IF;

  SELECT COUNT(*), MAX(image_url) FILTER (WHERE is_cover = TRUE)
  INTO cnt, cover_url
  FROM public.property_virtual_tours
  WHERE property_id = target_property_id;

  -- Fallback cover url to first image if no explicit cover set
  IF cover_url IS NULL AND cnt > 0 THEN
    SELECT image_url INTO cover_url
    FROM public.property_virtual_tours
    WHERE property_id = target_property_id
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  UPDATE public.properties
  SET
    has_virtual_tour = (cnt > 0),
    virtual_tour_count = cnt,
    virtual_tour_cover = cover_url
  WHERE id = target_property_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_virtual_tour_stats ON public.property_virtual_tours;
CREATE TRIGGER trigger_sync_virtual_tour_stats
AFTER INSERT OR UPDATE OR DELETE ON public.property_virtual_tours
FOR EACH ROW EXECUTE FUNCTION public.sync_property_virtual_tour_stats();

-- 5. Storage bucket insertion for property-360
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-360', 'property-360', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Storage Policy setup
DROP POLICY IF EXISTS "Public Read 360 Images" ON storage.objects;
CREATE POLICY "Public Read 360 Images" ON storage.objects
FOR SELECT USING (bucket_id = 'property-360');

DROP POLICY IF EXISTS "Authenticated Upload 360 Images" ON storage.objects;
CREATE POLICY "Authenticated Upload 360 Images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'property-360');

-- 7. Disable RLS for smooth access
ALTER TABLE public.property_virtual_tours DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tour_analytics DISABLE ROW LEVEL SECURITY;
