import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en_common from '../../locales/en/common.json';
import en_home from '../../locales/en/home.json';
import en_property from '../../locales/en/property.json';
import en_search from '../../locales/en/search.json';
import en_menu from '../../locales/en/menu.json';
import en_footer from '../../locales/en/footer.json';
import en_about from '../../locales/en/about.json';
import en_contact from '../../locales/en/contact.json';
import en_blog from '../../locales/en/blog.json';
import en_faq from '../../locales/en/faq.json';
import en_auth from '../../locales/en/auth.json';
import en_dashboard from '../../locales/en/dashboard.json';
import en_profile from '../../locales/en/profile.json';
import en_agent from '../../locales/en/agent.json';
import en_admin from '../../locales/en/admin.json';
import en_portal from '../../locales/en/portal.json';
import en_validation from '../../locales/en/validation.json';
import en_notifications from '../../locales/en/notifications.json';
import en_forms from '../../locales/en/forms.json';
import en_errors from '../../locales/en/errors.json';
import en_compare from '../../locales/en/compare.json';
import en_settings from '../../locales/en/settings.json';
import en_chat from '../../locales/en/chat.json';
import en_ai from '../../locales/en/ai.json';
import en_langModal from '../../locales/en/langModal.json';
import en_nav from '../../locales/en/nav.json';
import en_notFound from '../../locales/en/notFound.json';
import hi_common from '../../locales/hi/common.json';
import hi_home from '../../locales/hi/home.json';
import hi_property from '../../locales/hi/property.json';
import hi_search from '../../locales/hi/search.json';
import hi_menu from '../../locales/hi/menu.json';
import hi_footer from '../../locales/hi/footer.json';
import hi_about from '../../locales/hi/about.json';
import hi_contact from '../../locales/hi/contact.json';
import hi_blog from '../../locales/hi/blog.json';
import hi_faq from '../../locales/hi/faq.json';
import hi_auth from '../../locales/hi/auth.json';
import hi_dashboard from '../../locales/hi/dashboard.json';
import hi_profile from '../../locales/hi/profile.json';
import hi_agent from '../../locales/hi/agent.json';
import hi_admin from '../../locales/hi/admin.json';
import hi_portal from '../../locales/hi/portal.json';
import hi_validation from '../../locales/hi/validation.json';
import hi_notifications from '../../locales/hi/notifications.json';
import hi_forms from '../../locales/hi/forms.json';
import hi_errors from '../../locales/hi/errors.json';
import hi_compare from '../../locales/hi/compare.json';
import hi_settings from '../../locales/hi/settings.json';
import hi_chat from '../../locales/hi/chat.json';
import hi_ai from '../../locales/hi/ai.json';
import hi_langModal from '../../locales/hi/langModal.json';
import hi_nav from '../../locales/hi/nav.json';
import hi_notFound from '../../locales/hi/notFound.json';
import te_common from '../../locales/te/common.json';
import te_home from '../../locales/te/home.json';
import te_property from '../../locales/te/property.json';
import te_search from '../../locales/te/search.json';
import te_menu from '../../locales/te/menu.json';
import te_footer from '../../locales/te/footer.json';
import te_about from '../../locales/te/about.json';
import te_contact from '../../locales/te/contact.json';
import te_blog from '../../locales/te/blog.json';
import te_faq from '../../locales/te/faq.json';
import te_auth from '../../locales/te/auth.json';
import te_dashboard from '../../locales/te/dashboard.json';
import te_profile from '../../locales/te/profile.json';
import te_agent from '../../locales/te/agent.json';
import te_admin from '../../locales/te/admin.json';
import te_portal from '../../locales/te/portal.json';
import te_validation from '../../locales/te/validation.json';
import te_notifications from '../../locales/te/notifications.json';
import te_forms from '../../locales/te/forms.json';
import te_errors from '../../locales/te/errors.json';
import te_compare from '../../locales/te/compare.json';
import te_settings from '../../locales/te/settings.json';
import te_chat from '../../locales/te/chat.json';
import te_ai from '../../locales/te/ai.json';
import te_langModal from '../../locales/te/langModal.json';
import te_nav from '../../locales/te/nav.json';
import te_notFound from '../../locales/te/notFound.json';
import ta_common from '../../locales/ta/common.json';
import ta_home from '../../locales/ta/home.json';
import ta_property from '../../locales/ta/property.json';
import ta_search from '../../locales/ta/search.json';
import ta_menu from '../../locales/ta/menu.json';
import ta_footer from '../../locales/ta/footer.json';
import ta_about from '../../locales/ta/about.json';
import ta_contact from '../../locales/ta/contact.json';
import ta_blog from '../../locales/ta/blog.json';
import ta_faq from '../../locales/ta/faq.json';
import ta_auth from '../../locales/ta/auth.json';
import ta_dashboard from '../../locales/ta/dashboard.json';
import ta_profile from '../../locales/ta/profile.json';
import ta_agent from '../../locales/ta/agent.json';
import ta_admin from '../../locales/ta/admin.json';
import ta_portal from '../../locales/ta/portal.json';
import ta_validation from '../../locales/ta/validation.json';
import ta_notifications from '../../locales/ta/notifications.json';
import ta_forms from '../../locales/ta/forms.json';
import ta_errors from '../../locales/ta/errors.json';
import ta_compare from '../../locales/ta/compare.json';
import ta_settings from '../../locales/ta/settings.json';
import ta_chat from '../../locales/ta/chat.json';
import ta_ai from '../../locales/ta/ai.json';
import ta_langModal from '../../locales/ta/langModal.json';
import ta_nav from '../../locales/ta/nav.json';
import ta_notFound from '../../locales/ta/notFound.json';
import kn_common from '../../locales/kn/common.json';
import kn_home from '../../locales/kn/home.json';
import kn_property from '../../locales/kn/property.json';
import kn_search from '../../locales/kn/search.json';
import kn_menu from '../../locales/kn/menu.json';
import kn_footer from '../../locales/kn/footer.json';
import kn_about from '../../locales/kn/about.json';
import kn_contact from '../../locales/kn/contact.json';
import kn_blog from '../../locales/kn/blog.json';
import kn_faq from '../../locales/kn/faq.json';
import kn_auth from '../../locales/kn/auth.json';
import kn_dashboard from '../../locales/kn/dashboard.json';
import kn_profile from '../../locales/kn/profile.json';
import kn_agent from '../../locales/kn/agent.json';
import kn_admin from '../../locales/kn/admin.json';
import kn_portal from '../../locales/kn/portal.json';
import kn_validation from '../../locales/kn/validation.json';
import kn_notifications from '../../locales/kn/notifications.json';
import kn_forms from '../../locales/kn/forms.json';
import kn_errors from '../../locales/kn/errors.json';
import kn_compare from '../../locales/kn/compare.json';
import kn_settings from '../../locales/kn/settings.json';
import kn_chat from '../../locales/kn/chat.json';
import kn_ai from '../../locales/kn/ai.json';
import kn_langModal from '../../locales/kn/langModal.json';
import kn_nav from '../../locales/kn/nav.json';
import kn_notFound from '../../locales/kn/notFound.json';
import ml_common from '../../locales/ml/common.json';
import ml_home from '../../locales/ml/home.json';
import ml_property from '../../locales/ml/property.json';
import ml_search from '../../locales/ml/search.json';
import ml_menu from '../../locales/ml/menu.json';
import ml_footer from '../../locales/ml/footer.json';
import ml_about from '../../locales/ml/about.json';
import ml_contact from '../../locales/ml/contact.json';
import ml_blog from '../../locales/ml/blog.json';
import ml_faq from '../../locales/ml/faq.json';
import ml_auth from '../../locales/ml/auth.json';
import ml_dashboard from '../../locales/ml/dashboard.json';
import ml_profile from '../../locales/ml/profile.json';
import ml_agent from '../../locales/ml/agent.json';
import ml_admin from '../../locales/ml/admin.json';
import ml_portal from '../../locales/ml/portal.json';
import ml_validation from '../../locales/ml/validation.json';
import ml_notifications from '../../locales/ml/notifications.json';
import ml_forms from '../../locales/ml/forms.json';
import ml_errors from '../../locales/ml/errors.json';
import ml_compare from '../../locales/ml/compare.json';
import ml_settings from '../../locales/ml/settings.json';
import ml_chat from '../../locales/ml/chat.json';
import ml_ai from '../../locales/ml/ai.json';
import ml_langModal from '../../locales/ml/langModal.json';
import ml_nav from '../../locales/ml/nav.json';
import ml_notFound from '../../locales/ml/notFound.json';
import mr_common from '../../locales/mr/common.json';
import mr_home from '../../locales/mr/home.json';
import mr_property from '../../locales/mr/property.json';
import mr_search from '../../locales/mr/search.json';
import mr_menu from '../../locales/mr/menu.json';
import mr_footer from '../../locales/mr/footer.json';
import mr_about from '../../locales/mr/about.json';
import mr_contact from '../../locales/mr/contact.json';
import mr_blog from '../../locales/mr/blog.json';
import mr_faq from '../../locales/mr/faq.json';
import mr_auth from '../../locales/mr/auth.json';
import mr_dashboard from '../../locales/mr/dashboard.json';
import mr_profile from '../../locales/mr/profile.json';
import mr_agent from '../../locales/mr/agent.json';
import mr_admin from '../../locales/mr/admin.json';
import mr_portal from '../../locales/mr/portal.json';
import mr_validation from '../../locales/mr/validation.json';
import mr_notifications from '../../locales/mr/notifications.json';
import mr_forms from '../../locales/mr/forms.json';
import mr_errors from '../../locales/mr/errors.json';
import mr_compare from '../../locales/mr/compare.json';
import mr_settings from '../../locales/mr/settings.json';
import mr_chat from '../../locales/mr/chat.json';
import mr_ai from '../../locales/mr/ai.json';
import mr_langModal from '../../locales/mr/langModal.json';
import mr_nav from '../../locales/mr/nav.json';
import mr_notFound from '../../locales/mr/notFound.json';
import bn_common from '../../locales/bn/common.json';
import bn_home from '../../locales/bn/home.json';
import bn_property from '../../locales/bn/property.json';
import bn_search from '../../locales/bn/search.json';
import bn_menu from '../../locales/bn/menu.json';
import bn_footer from '../../locales/bn/footer.json';
import bn_about from '../../locales/bn/about.json';
import bn_contact from '../../locales/bn/contact.json';
import bn_blog from '../../locales/bn/blog.json';
import bn_faq from '../../locales/bn/faq.json';
import bn_auth from '../../locales/bn/auth.json';
import bn_dashboard from '../../locales/bn/dashboard.json';
import bn_profile from '../../locales/bn/profile.json';
import bn_agent from '../../locales/bn/agent.json';
import bn_admin from '../../locales/bn/admin.json';
import bn_portal from '../../locales/bn/portal.json';
import bn_validation from '../../locales/bn/validation.json';
import bn_notifications from '../../locales/bn/notifications.json';
import bn_forms from '../../locales/bn/forms.json';
import bn_errors from '../../locales/bn/errors.json';
import bn_compare from '../../locales/bn/compare.json';
import bn_settings from '../../locales/bn/settings.json';
import bn_chat from '../../locales/bn/chat.json';
import bn_ai from '../../locales/bn/ai.json';
import bn_langModal from '../../locales/bn/langModal.json';
import bn_nav from '../../locales/bn/nav.json';
import bn_notFound from '../../locales/bn/notFound.json';
import gu_common from '../../locales/gu/common.json';
import gu_home from '../../locales/gu/home.json';
import gu_property from '../../locales/gu/property.json';
import gu_search from '../../locales/gu/search.json';
import gu_menu from '../../locales/gu/menu.json';
import gu_footer from '../../locales/gu/footer.json';
import gu_about from '../../locales/gu/about.json';
import gu_contact from '../../locales/gu/contact.json';
import gu_blog from '../../locales/gu/blog.json';
import gu_faq from '../../locales/gu/faq.json';
import gu_auth from '../../locales/gu/auth.json';
import gu_dashboard from '../../locales/gu/dashboard.json';
import gu_profile from '../../locales/gu/profile.json';
import gu_agent from '../../locales/gu/agent.json';
import gu_admin from '../../locales/gu/admin.json';
import gu_portal from '../../locales/gu/portal.json';
import gu_validation from '../../locales/gu/validation.json';
import gu_notifications from '../../locales/gu/notifications.json';
import gu_forms from '../../locales/gu/forms.json';
import gu_errors from '../../locales/gu/errors.json';
import gu_compare from '../../locales/gu/compare.json';
import gu_settings from '../../locales/gu/settings.json';
import gu_chat from '../../locales/gu/chat.json';
import gu_ai from '../../locales/gu/ai.json';
import gu_langModal from '../../locales/gu/langModal.json';
import gu_nav from '../../locales/gu/nav.json';
import gu_notFound from '../../locales/gu/notFound.json';
import pa_common from '../../locales/pa/common.json';
import pa_home from '../../locales/pa/home.json';
import pa_property from '../../locales/pa/property.json';
import pa_search from '../../locales/pa/search.json';
import pa_menu from '../../locales/pa/menu.json';
import pa_footer from '../../locales/pa/footer.json';
import pa_about from '../../locales/pa/about.json';
import pa_contact from '../../locales/pa/contact.json';
import pa_blog from '../../locales/pa/blog.json';
import pa_faq from '../../locales/pa/faq.json';
import pa_auth from '../../locales/pa/auth.json';
import pa_dashboard from '../../locales/pa/dashboard.json';
import pa_profile from '../../locales/pa/profile.json';
import pa_agent from '../../locales/pa/agent.json';
import pa_admin from '../../locales/pa/admin.json';
import pa_portal from '../../locales/pa/portal.json';
import pa_validation from '../../locales/pa/validation.json';
import pa_notifications from '../../locales/pa/notifications.json';
import pa_forms from '../../locales/pa/forms.json';
import pa_errors from '../../locales/pa/errors.json';
import pa_compare from '../../locales/pa/compare.json';
import pa_settings from '../../locales/pa/settings.json';
import pa_chat from '../../locales/pa/chat.json';
import pa_ai from '../../locales/pa/ai.json';
import pa_langModal from '../../locales/pa/langModal.json';
import pa_nav from '../../locales/pa/nav.json';
import pa_notFound from '../../locales/pa/notFound.json';

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

export const ALL_NAMESPACES = [
  "common",
  "home",
  "property",
  "search",
  "menu",
  "footer",
  "about",
  "contact",
  "blog",
  "faq",
  "auth",
  "dashboard",
  "profile",
  "agent",
  "admin",
  "portal",
  "validation",
  "notifications",
  "forms",
  "errors",
  "compare",
  "settings",
  "chat",
  "ai",
  "langModal",
  "nav",
  "notFound"
];

const _SUPPORTED = new Set(SUPPORTED_LANGUAGES.map(l => l.code));
const _stored = typeof window !== 'undefined' ? localStorage.getItem('realtynow_language') : null;

// Default to saved language if valid, else 'en'
const savedLanguage = (_stored && _SUPPORTED.has(_stored)) ? _stored : 'en';

const resources = {
  en: {
    common: en_common,
    home: en_home,
    property: en_property,
    search: en_search,
    menu: en_menu,
    footer: en_footer,
    about: en_about,
    contact: en_contact,
    blog: en_blog,
    faq: en_faq,
    auth: en_auth,
    dashboard: en_dashboard,
    profile: en_profile,
    agent: en_agent,
    admin: en_admin,
    portal: en_portal,
    validation: en_validation,
    notifications: en_notifications,
    forms: en_forms,
    errors: en_errors,
    compare: en_compare,
    settings: en_settings,
    chat: en_chat,
    ai: en_ai,
    langModal: en_langModal,
    nav: en_nav,
    notFound: en_notFound,
  },
  hi: {
    common: hi_common,
    home: hi_home,
    property: hi_property,
    search: hi_search,
    menu: hi_menu,
    footer: hi_footer,
    about: hi_about,
    contact: hi_contact,
    blog: hi_blog,
    faq: hi_faq,
    auth: hi_auth,
    dashboard: hi_dashboard,
    profile: hi_profile,
    agent: hi_agent,
    admin: hi_admin,
    portal: hi_portal,
    validation: hi_validation,
    notifications: hi_notifications,
    forms: hi_forms,
    errors: hi_errors,
    compare: hi_compare,
    settings: hi_settings,
    chat: hi_chat,
    ai: hi_ai,
    langModal: hi_langModal,
    nav: hi_nav,
    notFound: hi_notFound,
  },
  te: {
    common: te_common,
    home: te_home,
    property: te_property,
    search: te_search,
    menu: te_menu,
    footer: te_footer,
    about: te_about,
    contact: te_contact,
    blog: te_blog,
    faq: te_faq,
    auth: te_auth,
    dashboard: te_dashboard,
    profile: te_profile,
    agent: te_agent,
    admin: te_admin,
    portal: te_portal,
    validation: te_validation,
    notifications: te_notifications,
    forms: te_forms,
    errors: te_errors,
    compare: te_compare,
    settings: te_settings,
    chat: te_chat,
    ai: te_ai,
    langModal: te_langModal,
    nav: te_nav,
    notFound: te_notFound,
  },
  ta: {
    common: ta_common,
    home: ta_home,
    property: ta_property,
    search: ta_search,
    menu: ta_menu,
    footer: ta_footer,
    about: ta_about,
    contact: ta_contact,
    blog: ta_blog,
    faq: ta_faq,
    auth: ta_auth,
    dashboard: ta_dashboard,
    profile: ta_profile,
    agent: ta_agent,
    admin: ta_admin,
    portal: ta_portal,
    validation: ta_validation,
    notifications: ta_notifications,
    forms: ta_forms,
    errors: ta_errors,
    compare: ta_compare,
    settings: ta_settings,
    chat: ta_chat,
    ai: ta_ai,
    langModal: ta_langModal,
    nav: ta_nav,
    notFound: ta_notFound,
  },
  kn: {
    common: kn_common,
    home: kn_home,
    property: kn_property,
    search: kn_search,
    menu: kn_menu,
    footer: kn_footer,
    about: kn_about,
    contact: kn_contact,
    blog: kn_blog,
    faq: kn_faq,
    auth: kn_auth,
    dashboard: kn_dashboard,
    profile: kn_profile,
    agent: kn_agent,
    admin: kn_admin,
    portal: kn_portal,
    validation: kn_validation,
    notifications: kn_notifications,
    forms: kn_forms,
    errors: kn_errors,
    compare: kn_compare,
    settings: kn_settings,
    chat: kn_chat,
    ai: kn_ai,
    langModal: kn_langModal,
    nav: kn_nav,
    notFound: kn_notFound,
  },
  ml: {
    common: ml_common,
    home: ml_home,
    property: ml_property,
    search: ml_search,
    menu: ml_menu,
    footer: ml_footer,
    about: ml_about,
    contact: ml_contact,
    blog: ml_blog,
    faq: ml_faq,
    auth: ml_auth,
    dashboard: ml_dashboard,
    profile: ml_profile,
    agent: ml_agent,
    admin: ml_admin,
    portal: ml_portal,
    validation: ml_validation,
    notifications: ml_notifications,
    forms: ml_forms,
    errors: ml_errors,
    compare: ml_compare,
    settings: ml_settings,
    chat: ml_chat,
    ai: ml_ai,
    langModal: ml_langModal,
    nav: ml_nav,
    notFound: ml_notFound,
  },
  mr: {
    common: mr_common,
    home: mr_home,
    property: mr_property,
    search: mr_search,
    menu: mr_menu,
    footer: mr_footer,
    about: mr_about,
    contact: mr_contact,
    blog: mr_blog,
    faq: mr_faq,
    auth: mr_auth,
    dashboard: mr_dashboard,
    profile: mr_profile,
    agent: mr_agent,
    admin: mr_admin,
    portal: mr_portal,
    validation: mr_validation,
    notifications: mr_notifications,
    forms: mr_forms,
    errors: mr_errors,
    compare: mr_compare,
    settings: mr_settings,
    chat: mr_chat,
    ai: mr_ai,
    langModal: mr_langModal,
    nav: mr_nav,
    notFound: mr_notFound,
  },
  bn: {
    common: bn_common,
    home: bn_home,
    property: bn_property,
    search: bn_search,
    menu: bn_menu,
    footer: bn_footer,
    about: bn_about,
    contact: bn_contact,
    blog: bn_blog,
    faq: bn_faq,
    auth: bn_auth,
    dashboard: bn_dashboard,
    profile: bn_profile,
    agent: bn_agent,
    admin: bn_admin,
    portal: bn_portal,
    validation: bn_validation,
    notifications: bn_notifications,
    forms: bn_forms,
    errors: bn_errors,
    compare: bn_compare,
    settings: bn_settings,
    chat: bn_chat,
    ai: bn_ai,
    langModal: bn_langModal,
    nav: bn_nav,
    notFound: bn_notFound,
  },
  gu: {
    common: gu_common,
    home: gu_home,
    property: gu_property,
    search: gu_search,
    menu: gu_menu,
    footer: gu_footer,
    about: gu_about,
    contact: gu_contact,
    blog: gu_blog,
    faq: gu_faq,
    auth: gu_auth,
    dashboard: gu_dashboard,
    profile: gu_profile,
    agent: gu_agent,
    admin: gu_admin,
    portal: gu_portal,
    validation: gu_validation,
    notifications: gu_notifications,
    forms: gu_forms,
    errors: gu_errors,
    compare: gu_compare,
    settings: gu_settings,
    chat: gu_chat,
    ai: gu_ai,
    langModal: gu_langModal,
    nav: gu_nav,
    notFound: gu_notFound,
  },
  pa: {
    common: pa_common,
    home: pa_home,
    property: pa_property,
    search: pa_search,
    menu: pa_menu,
    footer: pa_footer,
    about: pa_about,
    contact: pa_contact,
    blog: pa_blog,
    faq: pa_faq,
    auth: pa_auth,
    dashboard: pa_dashboard,
    profile: pa_profile,
    agent: pa_agent,
    admin: pa_admin,
    portal: pa_portal,
    validation: pa_validation,
    notifications: pa_notifications,
    forms: pa_forms,
    errors: pa_errors,
    compare: pa_compare,
    settings: pa_settings,
    chat: pa_chat,
    ai: pa_ai,
    langModal: pa_langModal,
    nav: pa_nav,
    notFound: pa_notFound,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'en',
  ns: ALL_NAMESPACES,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export async function loadLanguageResources(_langCode: string) {
  return Promise.resolve();
}

export default i18n;
