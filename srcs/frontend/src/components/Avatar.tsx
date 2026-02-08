// /srcs/frontend/src/components/Avatar.tsx
import React, { useState } from 'react';
import { getDefaultAvatar } from '../assets/avatars';

interface AvatarProps {
    src?: string | null;  // avatarUrl from userProfile
    userId: number;       // userProfile.id
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
    const [loading, setLoading] = useState(!!src);
    
    // Use default avatar if no src, or if OAuth image failed to load
    const avatarSrc = (!src || imgError) 
        ? getDefaultAvatar(userId) 
        : src;
    
    const handleError = () => {
        console.log('ERROR Failed to load OAuth avatar, using default');
        setImgError(true);
        setLoading(false);
    };
    
    const handleLoad = () => {
        console.log('OAuth avatar loaded successfully');
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
                backgroundColor: '#e0e0e0'
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
                    backgroundColor: '#f0f0f0'
                }}>
                    ...
                </div>
            )}
            <img
                src={avatarSrc}
                alt={alt}
                onError={handleError}
                onLoad={src ? handleLoad : undefined}
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