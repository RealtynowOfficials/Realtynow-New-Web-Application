-- Migration: 20260725000000_0028_reset_default_language_to_english.sql
-- Description: Reset global default language to English.
--   - Ensures only English has is_default = true in the languages table.
--   - Resets any user_preferences rows where language_code = 'te'
--     (Telugu was incorrectly applied as system default) back to 'en'.

-- 1. Ensure English is the only default language
UPDATE public.languages
SET is_default = false
WHERE is_default = true AND language_code <> 'en';

UPDATE public.languages
SET is_default = true
WHERE language_code = 'en';

-- 2. Reset user preferences that were set to Telugu as a system-applied default
--    (not an explicit user choice -- resets to English)
UPDATE public.user_preferences
SET
  language_code = 'en',
  updated_at = now()
WHERE language_code = 'te';

-- 3. Also fix any NULL language_code rows -> default to English
UPDATE public.user_preferences
SET
  language_code = 'en',
  updated_at = now()
WHERE language_code IS NULL;
