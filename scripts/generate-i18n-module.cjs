const fs = require('fs');
const path = require('path');

const langs = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa'];
const namespaces = [
  'common',
  'home',
  'property',
  'search',
  'menu',
  'footer',
  'about',
  'contact',
  'blog',
  'faq',
  'auth',
  'dashboard',
  'profile',
  'agent',
  'admin',
  'portal',
  'validation',
  'notifications',
  'forms',
  'errors',
  'compare',
  'settings',
  'chat',
  'ai',
  'langModal',
  'nav',
  'notFound'
];

let imports = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

`;

langs.forEach(lang => {
  namespaces.forEach(ns => {
    imports += `import ${lang}_${ns} from '../../locales/${lang}/${ns}.json';\n`;
  });
});

let resourceBlock = 'const resources = {\n';
langs.forEach(lang => {
  resourceBlock += `  ${lang}: {\n`;
  namespaces.forEach(ns => {
    resourceBlock += `    ${ns}: ${lang}_${ns},\n`;
  });
  resourceBlock += '  },\n';
});
resourceBlock += '};\n';

const fileContent = `${imports}
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

export const ALL_NAMESPACES = ${JSON.stringify(namespaces, null, 2)};

const _SUPPORTED = new Set(SUPPORTED_LANGUAGES.map(l => l.code));
const _stored = typeof window !== 'undefined' ? localStorage.getItem('realtynow_language') : null;

// Default to saved language if valid, else 'en'
const savedLanguage = (_stored && _SUPPORTED.has(_stored)) ? _stored : 'en';

${resourceBlock}
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
`;

const dest = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'i18n.ts');
fs.writeFileSync(dest, fileContent, 'utf8');
console.log('Successfully generated src/lib/i18n/i18n.ts with all 27 namespaces for 10 languages!');
