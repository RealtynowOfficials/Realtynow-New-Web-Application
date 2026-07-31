-- Migration: 20260727010000_0051_dynamic_advertisements.sql
-- Description: Extending advertisements table for the Dynamic Advertisement Management System.

-- 1. Add missing columns to public.advertisements
ALTER TABLE public.advertisements
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ad_type TEXT DEFAULT 'Banner Image',
ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'RIGHT_SIDEBAR_TOP',
ADD COLUMN IF NOT EXISTS mobile_image TEXT,
ADD COLUMN IF NOT EXISTS redirect_url TEXT,
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Learn More',
ADD COLUMN IF NOT EXISTS html_content TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS target_page TEXT DEFAULT 'All Pages',
ADD COLUMN IF NOT EXISTS target_city TEXT DEFAULT 'All Cities',
ADD COLUMN IF NOT EXISTS target_property_type TEXT DEFAULT 'All Types',
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'All Devices',
ADD COLUMN IF NOT EXISTS ctr NUMERIC GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions::numeric) * 100, 2) ELSE 0 END
) STORED,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create ads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access for Ads'
    ) THEN
        CREATE POLICY "Public Access for Ads"
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'ads');
    END IF;
END $$;

-- Allow authenticated uploads to ads bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload ads'
    ) THEN
        CREATE POLICY "Authenticated users can upload ads"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'ads');
    END IF;
END $$;

-- Allow authenticated users to update/delete ads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can update ads'
    ) THEN
        CREATE POLICY "Authenticated users can update ads"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'ads');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can delete ads'
    ) THEN
        CREATE POLICY "Authenticated users can delete ads"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'ads');
    END IF;
END $$;

-- RPC to get active ads based on page and position
CREATE OR REPLACE FUNCTION public.get_active_advertisements(
    p_target_page TEXT,
    p_position TEXT,
    p_device_type TEXT DEFAULT 'All Devices'
)
RETURNS SETOF public.advertisements
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.advertisements
    WHERE status = 'ACTIVE'
    AND deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
    AND (target_page = 'All Pages' OR target_page = p_target_page)
    AND position = p_position
    AND (device_type = 'All Devices' OR device_type = p_device_type)
    ORDER BY priority DESC, display_order ASC;
END;
$$;
