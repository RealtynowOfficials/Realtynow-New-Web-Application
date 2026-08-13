import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import i18n, { SUPPORTED_LANGUAGES, LanguageMeta } from './i18n';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

interface LanguageContextType {
  currentLanguage: LanguageMeta;
  changeLanguage: (code: string) => Promise<void>;
  supportedLanguages: LanguageMeta[];
  loading: boolean;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const ALL_NAMESPACES = [
  'common',
  'home',
  'auth',
  'property',
  'dashboard',
  'profile',
  'agent',
  'admin',
  'validation',
  'notifications',
  'ai',
];

const SUPPORTED_CODES = new Set(['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa']);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [langCode, setLangCode] = useState<string>(() => {
    let saved = localStorage.getItem('realtynow_language');
    // Force reset if Telugu was accidentally saved as default
    if (saved === 'te') {
      localStorage.setItem('realtynow_language', 'en');
      saved = 'en';
    }
    // If no saved preference or saved value is unsupported, default to English
    if (!saved || !SUPPORTED_CODES.has(saved)) {
      localStorage.setItem('realtynow_language', 'en');
      return 'en';
    }
    return saved;
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Subscribe to i18n languageChanged event for instant reactive UI updates
  useEffect(() => {
    const handleLangChange = (lng: string) => {
      setLangCode(lng);
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', handleLangChange);

    // Initial sync — enforce English as fallback if localStorage value is missing/unsupported
    const rawLang = localStorage.getItem('realtynow_language') || 'en';
    const initialLang = SUPPORTED_CODES.has(rawLang) ? rawLang : 'en';
    if (initialLang !== rawLang) {
      localStorage.setItem('realtynow_language', 'en');
    }
    if (i18n.language !== initialLang) {
      i18n.changeLanguage(initialLang);
    }
    document.documentElement.lang = initialLang;

    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  // Sync the user's saved language preference from Supabase on login, so a preference set on
  // one device carries over to another. This was previously disabled entirely because a bad
  // system default ('te') had been written into user_preferences for accounts that never chose
  // it — migration 0028 (20260725000000_0028_reset_default_language_to_english.sql) fixed that
  // at the source (reset corrupted rows to 'en' and corrected `languages.is_default`), so it's
  // now safe to read the preference back; only apply it if it's a currently supported code and
  // differs from what's already active, so it can't fight an in-session language change.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('user_preferences')
      .select('language_code')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const saved = data?.language_code;
        if (saved && SUPPORTED_CODES.has(saved) && saved !== i18n.language) {
          i18n.changeLanguage(saved);
          setLangCode(saved);
          localStorage.setItem('realtynow_language', saved);
          document.documentElement.lang = saved;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentLanguage = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  }, [langCode]);

  const changeLanguage = async (code: string) => {
    const target = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (!target) return;

    setLoading(true);
    try {
      await i18n.changeLanguage(code);
      setLangCode(code);
      localStorage.setItem('realtynow_language', code);
      document.documentElement.lang = code;

      // Persist to Supabase database if authenticated
      if (user) {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          language_code: code,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error changing language:', err);
    } finally {
      setLoading(false);
    }
  };

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (!key) return fallback || '';

      // 1. Dot notation namespace resolution (e.g., "common.sale", "home.heroTitle", "property.bedrooms")
      if (key.includes('.')) {
        const parts = key.split('.');
        const ns = parts[0];
        const subKey = parts.slice(1).join('.');

        const nsVal = i18n.t(subKey, { ns, lng: langCode, defaultValue: '' });
        if (nsVal && nsVal !== subKey && nsVal !== key) {
          return nsVal;
        }
      }

      // 2. Multi-namespace fallback search in active language
      for (const ns of ALL_NAMESPACES) {
        const val = i18n.t(key, { ns, lng: langCode, defaultValue: '' });
        if (val && val !== key && val !== `${ns}:${key}`) {
          return val;
        }
      }

      return fallback || key;
    },
    [langCode],
  );

  const value = useMemo(
    () => ({
      currentLanguage,
      changeLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      loading,
      t,
    }),
    [currentLanguage, loading, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguageContext = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};
