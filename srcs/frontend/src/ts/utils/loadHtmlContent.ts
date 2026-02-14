export const loadHtmlContent = async (fileName: string, language: string): Promise<string> => {
	try {
	  // Update the path - go up from ts/utils/ to src/ then into local/
	  const htmlModule = await import(`../../local/${language}/${fileName}.html?raw`);
	  return htmlModule.default;
	} catch (error) {
	  console.error(`Error loading ${fileName}.html for language ${language}:`, error);
	  // Fallback to English if the file doesn't exist
	  try {
		const fallbackModule = await import(`../../local/en/${fileName}.html?raw`);
		return fallbackModule.default;
	  } catch (fallbackError) {
		return `<p>Error loading content</p>`;
	  }
	}
  };