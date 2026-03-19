// /srcs/frontend/src/components/Avatar.tsx
import React, { useState } from 'react';
import { getDefaultAvatar, getAvatarUrlById } from '../assets/avatars';
import nouserAvatar from '../assets/nouser_chatgpt.png';

interface AvatarProps {
    src?: string | null;  // Can be: OAuth URL, avatar ID, or null
    userId: number;
    size?: number;
    alt?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
    src, 
    userId, 
    size = 80, 
    alt = 'User avatar' 
}) => {
    const [imgError, setImgError] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Determine the actual image URL to display
    let avatarSrc: string;
    let isOAuthUrl = false;
    
    if (src === 'deleted') {
        avatarSrc = nouserAvatar;
        console.log('🚫 [Avatar] Using anonymous avatar for deleted user');
    } else if (!src || imgError) {
        // No avatar or error loading - use default based on user ID
        avatarSrc = getDefaultAvatar(userId);
        console.log('🎨 [Avatar] Using default avatar for user', userId);
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
        // OAuth provider URL - use as is
        avatarSrc = src;
        isOAuthUrl = true;
        console.log('🌐 [Avatar] Using OAuth URL:', src);
    } else {
        // Avatar ID from gallery - resolve to actual URL
        const resolvedUrl = getAvatarUrlById(src);
        avatarSrc = resolvedUrl || getDefaultAvatar(userId);
        console.log('🖼️ [Avatar] Resolved avatar ID', src, 'to URL:', avatarSrc);
    }
    
    const handleError = () => {
        console.log('❌ [Avatar] Failed to load avatar, using default');
        setImgError(true);
        setLoading(false);
    };
    
    const handleLoadStart = () => {
        // Only show loading for OAuth URLs (external images)
        if (isOAuthUrl) {
            setLoading(true);
        }
    };
    
    const handleLoad = () => {
        console.log('✅ [Avatar] Avatar loaded successfully');
        setLoading(false);
    };

    return (
        <div 
            className={`relative inline-block rounded-full overflow-hidden w-[${size}px] h-[${size}px]`}
            style={{ backgroundColor: '#e0e0e0' }}
        >
            {loading && (
                <div
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[12px] text-[#666]"
                    style={{ backgroundColor: '#f0f0f0' }}
                >
                    ...
                </div>
            )}
            <img
                src={avatarSrc}
                alt={alt}
                title={alt}
                onLoadStart={handleLoadStart}
                onError={handleError}
                onLoad={handleLoad}
                className={`w-[${size}px] h-[${size}px] object-cover ${loading ? 'none' : 'block'}`}
            />
        </div>
    );
};