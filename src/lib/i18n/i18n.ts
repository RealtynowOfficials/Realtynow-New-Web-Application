import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en_common from '../../locales/en/common.json';
import en_auth from '../../locales/en/auth.json';
import en_home from '../../locales/en/home.json';
import en_property from '../../locales/en/property.json';
import en_dashboard from '../../locales/en/dashboard.json';
import en_profile from '../../locales/en/profile.json';
import en_agent from '../../locales/en/agent.json';
import en_admin from '../../locales/en/admin.json';
import en_validation from '../../locales/en/validation.json';
import en_notifications from '../../locales/en/notifications.json';
import en_ai from '../../locales/en/ai.json';
import hi_common from '../../locales/hi/common.json';
import hi_auth from '../../locales/hi/auth.json';
import hi_home from '../../locales/hi/home.json';
import hi_property from '../../locales/hi/property.json';
import hi_dashboard from '../../locales/hi/dashboard.json';
import hi_profile from '../../locales/hi/profile.json';
import hi_agent from '../../locales/hi/agent.json';
import hi_admin from '../../locales/hi/admin.json';
import hi_validation from '../../locales/hi/validation.json';
import hi_notifications from '../../locales/hi/notifications.json';
import hi_ai from '../../locales/hi/ai.json';
import te_common from '../../locales/te/common.json';
import te_auth from '../../locales/te/auth.json';
import te_home from '../../locales/te/home.json';
import te_property from '../../locales/te/property.json';
import te_dashboard from '../../locales/te/dashboard.json';
import te_profile from '../../locales/te/profile.json';
import te_agent from '../../locales/te/agent.json';
import te_admin from '../../locales/te/admin.json';
import te_validation from '../../locales/te/validation.json';
import te_notifications from '../../locales/te/notifications.json';
import te_ai from '../../locales/te/ai.json';
import ta_common from '../../locales/ta/common.json';
import ta_auth from '../../locales/ta/auth.json';
import ta_home from '../../locales/ta/home.json';
import ta_property from '../../locales/ta/property.json';
import ta_dashboard from '../../locales/ta/dashboard.json';
import ta_profile from '../../locales/ta/profile.json';
import ta_agent from '../../locales/ta/agent.json';
import ta_admin from '../../locales/ta/admin.json';
import ta_validation from '../../locales/ta/validation.json';
import ta_notifications from '../../locales/ta/notifications.json';
import ta_ai from '../../locales/ta/ai.json';
import kn_common from '../../locales/kn/common.json';
import kn_auth from '../../locales/kn/auth.json';
import kn_home from '../../locales/kn/home.json';
import kn_property from '../../locales/kn/property.json';
import kn_dashboard from '../../locales/kn/dashboard.json';
import kn_profile from '../../locales/kn/profile.json';
import kn_agent from '../../locales/kn/agent.json';
import kn_admin from '../../locales/kn/admin.json';
import kn_validation from '../../locales/kn/validation.json';
import kn_notifications from '../../locales/kn/notifications.json';
import kn_ai from '../../locales/kn/ai.json';
import ml_common from '../../locales/ml/common.json';
import ml_auth from '../../locales/ml/auth.json';
import ml_home from '../../locales/ml/home.json';
import ml_property from '../../locales/ml/property.json';
import ml_dashboard from '../../locales/ml/dashboard.json';
import ml_profile from '../../locales/ml/profile.json';
import ml_agent from '../../locales/ml/agent.json';
import ml_admin from '../../locales/ml/admin.json';
import ml_validation from '../../locales/ml/validation.json';
import ml_notifications from '../../locales/ml/notifications.json';
import ml_ai from '../../locales/ml/ai.json';
import mr_common from '../../locales/mr/common.json';
import mr_auth from '../../locales/mr/auth.json';
import mr_home from '../../locales/mr/home.json';
import mr_property from '../../locales/mr/property.json';
import mr_dashboard from '../../locales/mr/dashboard.json';
import mr_profile from '../../locales/mr/profile.json';
import mr_agent from '../../locales/mr/agent.json';
import mr_admin from '../../locales/mr/admin.json';
import mr_validation from '../../locales/mr/validation.json';
import mr_notifications from '../../locales/mr/notifications.json';
import mr_ai from '../../locales/mr/ai.json';
import bn_common from '../../locales/bn/common.json';
import bn_auth from '../../locales/bn/auth.json';
import bn_home from '../../locales/bn/home.json';
import bn_property from '../../locales/bn/property.json';
import bn_dashboard from '../../locales/bn/dashboard.json';
import bn_profile from '../../locales/bn/profile.json';
import bn_agent from '../../locales/bn/agent.json';
import bn_admin from '../../locales/bn/admin.json';
import bn_validation from '../../locales/bn/validation.json';
import bn_notifications from '../../locales/bn/notifications.json';
import bn_ai from '../../locales/bn/ai.json';
import gu_common from '../../locales/gu/common.json';
import gu_auth from '../../locales/gu/auth.json';
import gu_home from '../../locales/gu/home.json';
import gu_property from '../../locales/gu/property.json';
import gu_dashboard from '../../locales/gu/dashboard.json';
import gu_profile from '../../locales/gu/profile.json';
import gu_agent from '../../locales/gu/agent.json';
import gu_admin from '../../locales/gu/admin.json';
import gu_validation from '../../locales/gu/validation.json';
import gu_notifications from '../../locales/gu/notifications.json';
import gu_ai from '../../locales/gu/ai.json';
import pa_common from '../../locales/pa/common.json';
import pa_auth from '../../locales/pa/auth.json';
import pa_home from '../../locales/pa/home.json';
import pa_property from '../../locales/pa/property.json';
import pa_dashboard from '../../locales/pa/dashboard.json';
import pa_profile from '../../locales/pa/profile.json';
import pa_agent from '../../locales/pa/agent.json';
import pa_admin from '../../locales/pa/admin.json';
import pa_validation from '../../locales/pa/validation.json';
import pa_notifications from '../../locales/pa/notifications.json';
import pa_ai from '../../locales/pa/ai.json';

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
  displayOrder: number;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-IN', displayOrder: 1 },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN', displayOrder: 2 },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN', displayOrder: 3 },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN', displayOrder: 4 },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN', displayOrder: 5 },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN', displayOrder: 6 },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN', displayOrder: 7 },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN', displayOrder: 8 },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', bcp47: 'gu-IN', displayOrder: 9 },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN', displayOrder: 10 },
];

const _SUPPORTED = new Set(['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa']);
let _stored = typeof window !== 'undefined' ? localStorage.getItem('realtynow_language') : null;

// Force reset if Telugu was accidentally saved as default
if (_stored === 'te') {
  if (typeof window !== 'undefined') localStorage.setItem('realtynow_language', 'en');
  _stored = 'en';
}

// Default to 'en' — only honour a stored value if it's a known supported language
const savedLanguage = (_stored && _SUPPORTED.has(_stored)) ? _stored : 'en';
if (typeof window !== 'undefined' && !_stored) {
  localStorage.setItem('realtynow_language', 'en');
}

const resources = {
  en: {
    common: en_common,
    auth: en_auth,
    home: en_home,
    property: en_property,
    dashboard: en_dashboard,
    profile: en_profile,
    agent: en_agent,
    admin: en_admin,
    validation: en_validation,
    notifications: en_notifications,
    ai: en_ai,
  },
  hi: {
    common: hi_common,
    auth: hi_auth,
    home: hi_home,
    property: hi_property,
    dashboard: hi_dashboard,
    profile: hi_profile,
    agent: hi_agent,
    admin: hi_admin,
    validation: hi_validation,
    notifications: hi_notifications,
    ai: hi_ai,
  },
  te: {
    common: te_common,
    auth: te_auth,
    home: te_home,
    property: te_property,
    dashboard: te_dashboard,
    profile: te_profile,
    agent: te_agent,
    admin: te_admin,
    validation: te_validation,
    notifications: te_notifications,
    ai: te_ai,
  },
  ta: {
    common: ta_common,
    auth: ta_auth,
    home: ta_home,
    property: ta_property,
    dashboard: ta_dashboard,
    profile: ta_profile,
    agent: ta_agent,
    admin: ta_admin,
    validation: ta_validation,
    notifications: ta_notifications,
    ai: ta_ai,
  },
  kn: {
    common: kn_common,
    auth: kn_auth,
    home: kn_home,
    property: kn_property,
    dashboard: kn_dashboard,
    profile: kn_profile,
    agent: kn_agent,
    admin: kn_admin,
    validation: kn_validation,
    notifications: kn_notifications,
    ai: kn_ai,
  },
  ml: {
    common: ml_common,
    auth: ml_auth,
    home: ml_home,
    property: ml_property,
    dashboard: ml_dashboard,
    profile: ml_profile,
    agent: ml_agent,
    admin: ml_admin,
    validation: ml_validation,
    notifications: ml_notifications,
    ai: ml_ai,
  },
  mr: {
    common: mr_common,
    auth: mr_auth,
    home: mr_home,
    property: mr_property,
    dashboard: mr_dashboard,
    profile: mr_profile,
    agent: mr_agent,
    admin: mr_admin,
    validation: mr_validation,
    notifications: mr_notifications,
    ai: mr_ai,
  },
  bn: {
    common: bn_common,
    auth: bn_auth,
    home: bn_home,
    property: bn_property,
    dashboard: bn_dashboard,
    profile: bn_profile,
    agent: bn_agent,
    admin: bn_admin,
    validation: bn_validation,
    notifications: bn_notifications,
    ai: bn_ai,
  },
  gu: {
    common: gu_common,
    auth: gu_auth,
    home: gu_home,
    property: gu_property,
    dashboard: gu_dashboard,
    profile: gu_profile,
    agent: gu_agent,
    admin: gu_admin,
    validation: gu_validation,
    notifications: gu_notifications,
    ai: gu_ai,
  },
  pa: {
    common: pa_common,
    auth: pa_auth,
    home: pa_home,
    property: pa_property,
    dashboard: pa_dashboard,
    profile: pa_profile,
    agent: pa_agent,
    admin: pa_admin,
    validation: pa_validation,
    notifications: pa_notifications,
    ai: pa_ai,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'en',
  ns: [
    'common',
    'auth',
    'home',
    'property',
    'dashboard',
    'profile',
    'agent',
    'admin',
    'validation',
    'notifications',
    'ai',
  ],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export async function loadLanguageResources(langCode: string) {
  return Promise.resolve();
}

export default i18n;
