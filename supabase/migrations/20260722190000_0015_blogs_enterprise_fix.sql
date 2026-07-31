-- Migration: 20260722190000_0015_blogs_enterprise_fix.sql
-- Description: Fix RLS policies for blogs table so admins can view all drafts and published posts, enable Realtime.

-- 1. Ensure public.blogs columns are complete
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

-- 2. Drop restrictive read policy and allow admins to see ALL posts (drafts + published) & public to see published posts
DROP POLICY IF EXISTS "blogs_read" ON public.blogs;
DROP POLICY IF EXISTS "blogs_write" ON public.blogs;
DROP POLICY IF EXISTS "blogs_admin_all" ON public.blogs;
DROP POLICY IF EXISTS "blogs_read_public" ON public.blogs;

-- Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "blogs_admin_all" ON public.blogs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = author_id
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = author_id
  );

-- Public / Anonymous / Customers can view all published posts
CREATE POLICY "blogs_read_public" ON public.blogs
  FOR SELECT TO anon, authenticated
  USING (published = true);

-- 3. Enable REPLICA IDENTITY FULL and Realtime
ALTER TABLE public.blogs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blogs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;
