-- Migration: 20260723130000_0024_localization_schema.sql
-- Description: Create tables for languages and user preferences for enterprise multi-language localization.

CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  language_code VARCHAR(10) UNIQUE NOT NULL,
  country_code VARCHAR(10) DEFAULT 'IN',
  display_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code VARCHAR(10) DEFAULT 'en' REFERENCES public.languages(language_code) ON UPDATE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  notification_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed 10 Indian Languages
INSERT INTO public.languages (language_name, native_name, language_code, country_code, display_order, is_default, is_active) VALUES
  ('English',   'English',  'en', 'IN', 1,  true,  true),
  ('Hindi',     'हिन्दी',    'hi', 'IN', 2,  false, true),
  ('Telugu',    'తెలుగు',   'te', 'IN', 3,  false, true),
  ('Tamil',     'தமிழ்',    'ta', 'IN', 4,  false, true),
  ('Kannada',   'ಕನ್ನಡ',   'kn', 'IN', 5,  false, true),
  ('Malayalam', 'മലയാളം', 'ml', 'IN', 6,  false, true),
  ('Marathi',   'मराठी',   'mr', 'IN', 7,  false, true),
  ('Bengali',   'বাংলা',    'bn', 'IN', 8,  false, true),
  ('Gujarati',  'ગુજરાતી',  'gu', 'IN', 9,  false, true),
  ('Punjabi',   'ਪੰਜਾਬੀ',   'pa', 'IN', 10, false, true)
ON CONFLICT (language_code) DO UPDATE SET
  language_name = EXCLUDED.language_name,
  native_name = EXCLUDED.native_name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- RLS Policies
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "languages_read_public" ON public.languages;
CREATE POLICY "languages_read_public" ON public.languages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "languages_admin_all" ON public.languages;
CREATE POLICY "languages_admin_all" ON public.languages
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "user_preferences_owner_all" ON public.user_preferences;
CREATE POLICY "user_preferences_owner_all" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON public.languages TO anon, authenticated, service_role;
GRANT ALL ON public.user_preferences TO anon, authenticated, service_role;
