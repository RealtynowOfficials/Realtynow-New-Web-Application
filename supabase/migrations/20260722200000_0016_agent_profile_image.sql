-- Migration: 20260722200000_0016_agent_profile_image.sql
-- Description: Ensure avatar_url & profile_image_url exist on profiles table for Agent Profile Image Management.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Synchronize existing values between avatar_url & profile_image_url
UPDATE public.profiles SET profile_image_url = avatar_url WHERE profile_image_url IS NULL AND avatar_url IS NOT NULL;
UPDATE public.profiles SET avatar_url = profile_image_url WHERE avatar_url IS NULL AND profile_image_url IS NOT NULL;

-- Allow admins to update all agent profiles including avatar_url
DROP POLICY IF EXISTS "admin_update_agent_profiles" ON public.profiles;
CREATE POLICY "admin_update_agent_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
