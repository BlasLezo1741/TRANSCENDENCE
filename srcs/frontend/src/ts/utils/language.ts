export const getBrowserLanguage = (): string => {
	const browserLang = navigator.language || navigator.languages?.[0] || 'en';
	const normalizedLocale  = browserLang.replace('_', '-');
	// Extract first part before hyphen (if exists) and convert to lowercase
	const langCode = normalizedLocale.split('-')[0].toLowerCase();
	
	return langCode;
};

export const getBrowserCountry = (): string | null => {
const locale = navigator.language || navigator.languages?.[0];

if (!locale) {
	return null;
}
const normalizedLocale  = locale.replace('_', '-');

if (normalizedLocale.includes('-')) {
	const parts = normalizedLocale.split('-');
	// Return the country part in uppercase
	return parts[1].toUpperCase();
}
	
	// No country code available in browser locale
return null;
	
};

export const getBrowserLocale = (): { language: string; country: string | null } => {
	return {
	  language: getBrowserLanguage(),
	  country: getBrowserCountry(),
	};
};
