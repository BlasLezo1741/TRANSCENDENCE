// /srcs/frontend/src/assets/avatars/index.ts

// Eagerly import all PNG files in this directory
const avatarModules = import.meta.glob<{ default: string }>('./*.png', { eager: true });

// Extract the default exports (the image URLs) into an array
export const DEFAULT_AVATARS = Object.values(avatarModules).map(module => module.default);

// Get avatar info with metadata for selection UI
export interface AvatarInfo {
    url: string;
    id: string;      // Avatar identifier (e.g., "avatar-1")
    index: number;
    name: string;
}

export const getAvatarList = (): AvatarInfo[] => {
    return Object.entries(avatarModules).map(([path, module], index) => {
        // Extract filename without extension (e.g., "./avatar-1.png" -> "avatar-1")
        const filename = path.replace('./', '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
        
        return {
            url: module.default,
            id: filename,
            index,
            name: `Avatar ${index + 1}`
        };
    });
};

// Get avatar URL from ID (used when displaying)
export const getAvatarUrlById = (avatarId: string): string | null => {
    const avatars = getAvatarList();
    const avatar = avatars.find(a => a.id === avatarId);
    return avatar?.url || null;
};

// Get avatar ID from URL (used when saving)
export const getAvatarIdFromUrl = (url: string): string | null => {
    const avatars = getAvatarList();
    const avatar = avatars.find(a => a.url === url);
    return avatar?.id || null;
};

// Get a consistent default avatar based on user ID
export const getDefaultAvatar = (userId: number): string => {
    if (DEFAULT_AVATARS.length === 0) {
        console.warn('⚠️ No default avatars found!');
        return '';
    }
    const index = userId % DEFAULT_AVATARS.length;
    return DEFAULT_AVATARS[index];
};

// Get default avatar ID based on user ID
export const getDefaultAvatarId = (userId: number): string => {
    const avatars = getAvatarList();
    if (avatars.length === 0) {
        console.warn('⚠️ No default avatars found!');
        return '';
    }
    const index = userId % avatars.length;
    return avatars[index].id;
};

// Optional: Log loaded avatars for debugging
//console.log(`✅ Loaded ${DEFAULT_AVATARS.length} default avatars`);