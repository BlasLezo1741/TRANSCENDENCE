// frontend/src/ts/utils/countryName.ts
//
// Provides locale-aware country name display using the browser's built-in
// Intl.DisplayNames API. No external library or database change required —
// the ISO 3166-1 alpha-2 code (e.g. 'FR', 'ES') is all that is needed.
//
// Usage:
//   import { getCountryName, useCountryNames } from '../ts/utils/countryName';
//
//   // Single lookup (outside React or when locale is already known):
//   getCountryName('FR', 'fr')  // → "France"
//   getCountryName('ES', 'ca')  // → "Espanya"
//   getCountryName('DE', 'es')  // → "Alemania"
//
//   // Inside a React component (re-evaluates when i18n.language changes):
//   const countryName = useCountryNames();
//   countryName('FR')  // → localised name for the active UI language

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Returns the localised display name for an ISO 3166-1 alpha-2 country code.
 *
 * Falls back to the raw code if Intl.DisplayNames does not recognise it,
 * and falls back to the `fallback` parameter if provided (useful for
 * displaying the English name from the database when the code is unknown).
 *
 * @param code     - ISO 3166-1 alpha-2 code, e.g. 'FR', 'ES', 'DE'
 * @param locale   - BCP 47 language tag, e.g. 'fr', 'ca', 'en'
 * @param fallback - Optional fallback string (e.g. the DB English name)
 */
export function getCountryName(
    code: string,
    locale: string,
    fallback?: string
): string {
    if (!code) return fallback ?? '';
    try {
        const dn = new Intl.DisplayNames([locale], { type: 'region' });
        return dn.of(code.toUpperCase()) ?? fallback ?? code;
    } catch {
        // Intl.DisplayNames may throw for unsupported locales in very old browsers
        return fallback ?? code;
    }
}

/**
 * React hook that returns a memoized country name resolver for the active
 * i18n language. The resolver is recreated only when the language changes,
 * making it safe and efficient to call inside render.
 *
 * @returns A function: (code: string, fallback?: string) => string
 *
 * @example
 *   const countryName = useCountryNames();
 *   // In JSX:
 *   {countryName('FR')}           // → "France" / "França" / "Francia" ...
 *   {countryName('XX', 'Unknown')} // → "Unknown" (unrecognised code)
 */
export function useCountryNames(): (code: string, fallback?: string) => string {
    const { i18n } = useTranslation();

    const resolver = useMemo(() => {
        try {
            const dn = new Intl.DisplayNames([i18n.language], { type: 'region' });
            return (code: string, fallback?: string): string => {
                if (!code) return fallback ?? '';
                return dn.of(code.toUpperCase()) ?? fallback ?? code;
            };
        } catch {
            // Graceful degradation: return a resolver that just returns the code
            return (code: string, fallback?: string): string => fallback ?? code;
        }
    }, [i18n.language]);

    return resolver;
}
