// srcs/frontend/src/ts/utils/loadImageLang.ts
export const getLocalizedImagePath = (imageName: string, language: string): string => {
	try {
	  // Dynamically import the image based on language
	  // Note: We need to use a more specific path pattern for Vite to resolve correctly
	  // Preapared for different types of images (not required, but useful)
	  const images = import.meta.glob('../../local/*/*.{png,jpg,jpeg,gif,webp}', { eager: true, as: 'url' });
	  
	  const imagePath = `../../local/${language}/${imageName}`;
	  const resolvedImage = images[imagePath];
	  
	  if (resolvedImage) {
		return resolvedImage as string;
	  }
	  
	  // Fallback to English if the image doesn't exist for the current language
	  const fallbackPath = `../../local/en/${imageName}`;
	  const fallbackImage = images[fallbackPath];
	  
	  if (fallbackImage) {
		console.warn(`Image not found for language ${language}, using English fallback`);
		return fallbackImage as string;
	  }
	  
	  throw new Error(`Image ${imageName} not found`);
	} catch (error) {
	  console.error(`Error loading image ${imageName} for language ${language}:`, error);
	  return ''; // Return empty string as fallback
	}
  };