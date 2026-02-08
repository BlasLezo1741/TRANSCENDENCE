// /srcs/frontend/src/components/Avatar.tsx
import React, { useState } from 'react';
import { getDefaultAvatar, getAvatarUrlById } from '../assets/avatars';

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
    
    if (!src || imgError) {
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
            style={{ 
                width: size, 
                height: size, 
                position: 'relative',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#e0e0e0',
                display: 'inline-block'
            }}
        >
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    ...
                </div>
            )}
            <img
                src={avatarSrc}
                alt={alt}
                onLoadStart={handleLoadStart}
                onError={handleError}
                onLoad={handleLoad}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: loading ? 'none' : 'block'
                }}
            />
        </div>
    );
};