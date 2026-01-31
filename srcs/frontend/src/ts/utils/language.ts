/**
 * Get RAW browser language (not i18next language)
 * This should be used ONLY for OAuth initial detection
 * Returns any language code, not filtered by supported languages
 */
export const getRawBrowserLanguage = (): string => {
	const browserLang = navigator.language || navigator.languages?.[0] || 'en';
	const normalizedLocale = browserLang.replace('_', '-');
	const langCode = normalizedLocale.split('-')[0].toLowerCase();
	
	console.log('[Language Detection] Raw browser language:', langCode, 'from locale:', browserLang);
	return langCode;
};

/**
 * Get browser country from locale
 * Returns 2-letter country code or null
 */
export const getBrowserCountry = (): string | null => {
	const locale = navigator.language || navigator.languages?.[0];
	
	if (!locale) {
		console.log('[Country Detection] No browser locale available');
		return null;
	}
	
	const normalizedLocale = locale.replace('_', '-');
	
	if (normalizedLocale.includes('-')) {
		const parts = normalizedLocale.split('-');
		const country = parts[1].toUpperCase();
		console.log('[Country Detection] Browser country:', country, 'from locale:', locale);
		return country;
	}
	
	console.log('[Country Detection] No country in browser locale:', locale);
	return null;
};

/**
 * Get both language and country for OAuth
 * These are RAW values, not filtered by supported languages
 */
export const getBrowserLocale = (): { language: string; country: string | null } => {
	return {
		language: getRawBrowserLanguage(),
		country: getBrowserCountry(),
	};
};

/**
 * Get current app language from i18next (for registered users)
 * This is DIFFERENT from browser language
 */
export const getCurrentAppLanguage = (): string => {
	// This will be imported only when needed to avoid circular dependencies
	// Use it after user is logged in and you want to know their current app language
	return localStorage.getItem('i18nextLng') || 'en';
};
