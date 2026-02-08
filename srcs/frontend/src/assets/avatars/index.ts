// /srcs/frontend/src/assets/avatars/index.ts
// Import all PNG files in this directory
const avatarModules = import.meta.glob<{ default: string }>('./*.png', { eager: true });

// Extract the default exports (the image URLs) into an array
export const DEFAULT_AVATARS = Object.values(avatarModules).map(module => module.default);

// Get a consistent default avatar based on user ID
export const getDefaultAvatar = (userId: number): string => {
    if (DEFAULT_AVATARS.length === 0) {
        console.warn('No default avatars found!');
        return ''; // Or return a fallback placeholder
    }
    // Remainder of the operation User ID / num of avatars 
	// User always gets the same image (if no further images are loaded)
	const index = userId % DEFAULT_AVATARS.length; 
    return DEFAULT_AVATARS[index];
};

// Log loaded avatars for debugging
console.log(`Loaded ${DEFAULT_AVATARS.length} default avatars`);