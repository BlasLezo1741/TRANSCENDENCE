import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './local/en/translation.json';
import es from './local/es/translation.json';
import fr from './local/fr/translation.json';
import ca from './local/ca/translation.json';

i18n
  // 1. Detect user language
  .use(LanguageDetector)
  // 2. Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      ca: { translation: ca },
    },
    fallbackLng: 'en', // Default if language not found
    debug: true,

    detection: {
      // ORDER MATTERS:
      // 1. localStorage: Checks if user explicitly chose a language before
      // 2. navigator: Checks the browser's language setting
      order: ['localStorage', 'navigator'],
      
      // Where to store the user's choice
      caches: ['localStorage'], 
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    }
  });

export default i18n;