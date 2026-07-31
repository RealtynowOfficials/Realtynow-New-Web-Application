-- Fix infinite recursion in profiles RLS

-- The admin_select_profiles policy in 0011 did an inline SELECT on profiles,
-- causing infinite recursion because checking the policy requires checking the policy again.
-- We fix this by using the `is_admin()` function which is SECURITY DEFINER and bypasses RLS.

DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;
CREATE POLICY "admin_select_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());
