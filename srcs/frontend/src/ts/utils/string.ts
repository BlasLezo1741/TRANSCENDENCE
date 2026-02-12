// Capitalize only the first letter of the string
export const sentence = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// Capitalize the first letter of each word
// Minor words (articles/prepositions) stay lowercase unless they're the first word
const minorWords = [
	// English
	'of', 'the', 'and', 'in', 'a', 'an', 'to', 'for', 'or', 'but', 'at', 'by', 'with',
	// Spanish
	'de', 'del', 'el', 'la', 'las', 'los', 'en', 'y', 'o', 'por', 'al', 'con', 'sin', 'ni',
	// French
	'le', 'la', 'les', 'du', 'des', 'de', 'et', 'ou', 'au', 'aux', 'un', 'une', 'en', 'à', 'avec', 'sans',
	// Catalan
	'del', 'dels', 'el', 'la', 'els', 'les', 'i', 'ses', 'sa', 'es', 'amb', 'per', 'ni', 'o',
];

// Contractions that should stay lowercase with the next word capitalized
// e.g. "d'amics" → "d'Amics", "l'home" → "l'Home"
const contractions = ["d'", "l'", "n'", "s'", "c'", "j'", "m'", "t'", "qu'"];

const capitalizeWord = (word: string): string => {
	const lowerWord = word.toLowerCase();
	const contraction = contractions.find((c) => lowerWord.startsWith(c));

	if (contraction) {
		const rest = word.slice(contraction.length);
		return contraction + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
	}

	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

export const firstcap = (s: string): string =>
	s
		.split(' ')
		.map((word, i) => {
			// Check if the whole word is a contraction minor word (e.g. "d'" alone)
			if (i > 0 && minorWords.includes(word.toLowerCase())) {
				return word.toLowerCase();
			}
			// Check if word starts with a contraction that is also a minor word
			// e.g. "d'amics" → minor prefix "d'" + capitalize "Amics"
			const lowerWord = word.toLowerCase();
			const contraction = contractions.find((c) => lowerWord.startsWith(c));
			if (i > 0 && contraction && lowerWord === contraction) {
				// Standalone contraction like "d'" (rare but possible)
				return word.toLowerCase();
			}
			return capitalizeWord(word);
		})
		.join(' ');