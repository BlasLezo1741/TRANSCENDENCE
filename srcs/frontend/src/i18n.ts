import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './local/en/translation_en.json';
import es from './local/es/translation_es.json';
import fr from './local/fr/translation_fr.json';
import ca from './local/ca/translation_ca.json';

// Languages supported by the application.
// Any language code from the database that is NOT in this list will fall back to English.
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'ca'];

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

/**
 * Apply the language stored in the database for the logged-in user.
 *
 * Called by App.tsx immediately after a successful profile fetch (syncProfile).
 * This overrides whatever was previously in localStorage (browser default or a
 * previous session's manual choice) so the user always sees their preferred
 * language on login.
 *
 * If the database language is not one of the supported languages (e.g. 'de',
 * 'pt', 'ja') it falls back to English rather than showing a broken UI.
 *
 * After this call, i18next writes the chosen language back to localStorage via
 * its normal caching mechanism, so page refreshes within the same session keep
 * the correct language without hitting the API again.
 */
export function applyUserLanguage(dbLang: string | null | undefined): void {
  const lang = dbLang && SUPPORTED_LANGUAGES.includes(dbLang) ? dbLang : 'en';
  i18n.changeLanguage(lang);
}

export default i18n;