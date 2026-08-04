-- Migration: 20260727040000_0054_mobile_otp_auth.sql
-- Description: Adds mobile-number OTP auth support on top of the existing
--              Supabase Auth session model. profiles.email is relaxed to
--              nullable (phone-only auth.users rows have no email), and
--              new columns track mobile verification state. handle_new_user()
--              is updated to also copy phone and to work when email is null.
--              No RLS policy changes anywhere else are needed — everything
--              still keys off auth.uid() against the same profiles.id.

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code       TEXT DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS is_mobile_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_verified_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login         TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles(phone) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role, first_name, last_name, status, is_mobile_verified)
  VALUES (
    new.id,
    new.email,
    new.phone,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'active',
    (new.phone IS NOT NULL)
  );
  RETURN new;
END $$;
