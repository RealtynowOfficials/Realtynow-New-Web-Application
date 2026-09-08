import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import i18n, { SUPPORTED_LANGUAGES, ALL_NAMESPACES, LanguageMeta } from './i18n';
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

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeLanguages, setActiveLanguages] = useState<LanguageMeta[]>(SUPPORTED_LANGUAGES);
  const [langCode, setLangCode] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('realtynow_language');
    if (saved && SUPPORTED_CODES.has(saved)) {
      return saved;
    }
    // Check browser language
    try {
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
      if (browserLang && SUPPORTED_CODES.has(browserLang)) {
        localStorage.setItem('realtynow_language', browserLang);
        return browserLang;
      }
    } catch {
      // ignore
    }
    localStorage.setItem('realtynow_language', 'en');
    return 'en';
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Sync active languages from database
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('languages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return;
        const mapped: LanguageMeta[] = data.map((d: any) => ({
          code: d.language_code,
          name: d.language_name,
          nativeName: d.native_name,
          bcp47: `${d.language_code}-IN`,
          displayOrder: d.display_order ?? 0,
        }));
        setActiveLanguages(mapped);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to i18n languageChanged event for instant reactive UI updates
  useEffect(() => {
    const handleLangChange = (lng: string) => {
      setLangCode(lng);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
        document.documentElement.dir = 'ltr';
      }
    };
    i18n.on('languageChanged', handleLangChange);

    // Initial sync
    const rawLang = localStorage.getItem('realtynow_language') || 'en';
    const initialLang = SUPPORTED_CODES.has(rawLang) ? rawLang : 'en';
    if (i18n.language !== initialLang) {
      i18n.changeLanguage(initialLang);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initialLang;
      document.documentElement.dir = 'ltr';
    }

    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  // Sync user saved preference from database when authenticated
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from('user_preferences')
      .select('language_code')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const saved = data?.language_code;
        if (saved && SUPPORTED_CODES.has(saved) && saved !== i18n.language) {
          i18n.changeLanguage(saved);
          setLangCode(saved);
          localStorage.setItem('realtynow_language', saved);
          if (typeof document !== 'undefined') {
            document.documentElement.lang = saved;
            document.documentElement.dir = 'ltr';
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentLanguage = useMemo(() => {
    return activeLanguages.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  }, [activeLanguages, langCode]);

  const changeLanguage = async (code: string) => {
    const target = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (!target) return;

    setLoading(true);
    try {
      await i18n.changeLanguage(code);
      setLangCode(code);
      localStorage.setItem('realtynow_language', code);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = code;
        document.documentElement.dir = 'ltr';
      }

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

      // 1. Colon or Dot notation namespace resolution (e.g., "dashboard:dashboard", "dashboard.dashboard", "common:saved")
      let ns = '';
      let subKey = key;
      if (key.includes(':')) {
        const parts = key.split(':');
        ns = parts[0];
        subKey = parts.slice(1).join(':');
      } else if (key.includes('.')) {
        const parts = key.split('.');
        ns = parts[0];
        subKey = parts.slice(1).join('.');
      }

      if (ns && subKey) {
        const nsVal = i18n.t(subKey, { ns, lng: langCode, defaultValue: '' });
        if (nsVal && nsVal !== subKey && nsVal !== key && nsVal !== `${ns}:${subKey}` && nsVal !== `${ns}.${subKey}`) {
          return nsVal;
        }

        // Try direct key query
        const directVal = i18n.t(key, { ns, lng: langCode, defaultValue: '' });
        if (directVal && directVal !== key && directVal !== `${ns}:${key}` && directVal !== `${ns}.${key}`) {
          return directVal;
        }
      }

      // 2. Search active language across all namespaces
      for (const curNs of ALL_NAMESPACES) {
        const val = i18n.t(subKey || key, { ns: curNs, lng: langCode, defaultValue: '' });
        if (val && val !== (subKey || key) && val !== `${curNs}:${subKey || key}` && val !== `${curNs}.${subKey || key}`) {
          return val;
        }
      }

      // 3. Fallback string or key
      return fallback || subKey || key;
    },
    [langCode],
  );

  const value = useMemo(
    () => ({
      currentLanguage,
      changeLanguage,
      supportedLanguages: activeLanguages,
      loading,
      t,
    }),
    [activeLanguages, currentLanguage, loading, t],
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
