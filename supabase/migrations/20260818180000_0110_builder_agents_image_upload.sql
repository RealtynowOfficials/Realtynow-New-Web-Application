-- =============================================================================
-- Migration: 20260818180000_0110_builder_agents_image_upload.sql
-- Description: Adds avatar_url to builder_agents and ensures agent-avatars
-- storage bucket exists with public read and authenticated write policies.
-- =============================================================================

-- 1. Add avatar_url column to builder_agents
ALTER TABLE public.builder_agents ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create agent-avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-avatars',
  'agent-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Storage RLS policies for agent-avatars
DROP POLICY IF EXISTS "public_read_agent_avatars" ON storage.objects;
CREATE POLICY "public_read_agent_avatars" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'agent-avatars');

DROP POLICY IF EXISTS "auth_upload_agent_avatars" ON storage.objects;
CREATE POLICY "auth_upload_agent_avatars" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'agent-avatars');

DROP POLICY IF EXISTS "auth_update_agent_avatars" ON storage.objects;
CREATE POLICY "auth_update_agent_avatars" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'agent-avatars') WITH CHECK (bucket_id = 'agent-avatars');

DROP POLICY IF EXISTS "auth_delete_agent_avatars" ON storage.objects;
CREATE POLICY "auth_delete_agent_avatars" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'agent-avatars');
