-- Migration: 20260723160000_0027_dynamic_localization_complete.sql
-- Description: Dynamic translation key-value store and multi-language schema enhancements.

CREATE TABLE IF NOT EXISTS public.language_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL REFERENCES public.languages(language_code) ON DELETE CASCADE ON UPDATE CASCADE,
  namespace TEXT NOT NULL DEFAULT 'common',
  key_name TEXT NOT NULL,
  translation_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_lang_ns_key UNIQUE (language_code, namespace, key_name)
);

-- RLS
ALTER TABLE public.language_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "translations_read_public" ON public.language_translations;
CREATE POLICY "translations_read_public" ON public.language_translations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "translations_admin_all" ON public.language_translations;
CREATE POLICY "translations_admin_all" ON public.language_translations
  FOR ALL USING (public.is_admin());

GRANT ALL ON public.language_translations TO anon, authenticated, service_role;
