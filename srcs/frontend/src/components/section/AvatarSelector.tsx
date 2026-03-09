// /srcs/frontend/src/components/AvatarSelector.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAvatarList, type AvatarInfo } from '../../assets/avatars';
import Btn from '../objects/Btn.tsx';
import Image from '../objects/Image.tsx';

interface AvatarSelectorProps {
    currentAvatarUrl?: string | null;
    onSelect: (avatarId: string) => void;
    onCancel: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
    currentAvatarUrl,
    onSelect,
    onCancel
}) => {
    const { t } = useTranslation();
    const [avatars, setAvatars] = useState<AvatarInfo[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

    useEffect(() => {
        const avatarList = getAvatarList();
        setAvatars(avatarList);
        
        // DEBUG: Log the avatars array structure
        console.log('🎨 [AvatarSelector] Loaded avatars:', avatarList);
        console.log('🎨 [AvatarSelector] Avatar IDs:', avatarList.map(a => a.id));
        
        // Pre-select current avatar if it's from the gallery
        if (currentAvatarUrl && !currentAvatarUrl.startsWith('http')) {
            const matchingAvatar = avatarList.find(a => a.id === currentAvatarUrl);
            if (matchingAvatar) {
                setSelectedAvatarId(matchingAvatar.id);
                console.log('🎯 [AvatarSelector] Pre-selected current avatar:', matchingAvatar.id);
            }
        }
    }, [currentAvatarUrl]);

    const handleSelect = () => {
        if (selectedAvatarId) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 [AvatarSelector] STEP 1: User clicked Select');
            console.log('🔍 [AvatarSelector] selectedAvatarId:', selectedAvatarId);
            console.log('🔍 [AvatarSelector] Type:', typeof selectedAvatarId);
            
            // DEBUG: Show all avatar IDs to compare
            console.log('🔍 [AvatarSelector] All available IDs:', avatars.map(a => a.id));
            
            // Find the avatar object
            const avatarObj = avatars.find(a => a.id === selectedAvatarId);
            
            console.log('🔍 [AvatarSelector] Looking for ID:', selectedAvatarId);
            console.log('🔍 [AvatarSelector] Found avatar object:', avatarObj);
            
            if (avatarObj) {
                console.log('🔍 [AvatarSelector] STEP 2: Sending avatar ID:', avatarObj.id);
                console.log('🔍 [AvatarSelector] Avatar URL is:', avatarObj.url);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                onSelect(avatarObj.id);
            } else {
                console.error('❌ [AvatarSelector] ERROR: Could not find avatar object for ID:', selectedAvatarId);
                console.error('❌ [AvatarSelector] Available avatars:', avatars);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            }
        } else {
            console.error('❌ [AvatarSelector] ERROR: No avatar selected!');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '30px',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
                    {t('prof.select_avatar')}
                </h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '15px',
                    marginBottom: '30px'
                }}>
                    {avatars.map((avatar) => (
                        <div
                            key={avatar.id}
                            onClick={() => {
                                console.log('👆 [AvatarSelector] Clicked avatar:', avatar.id);
                                setSelectedAvatarId(avatar.id);
                            }}
                            style={{
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '10px',
                                border: selectedAvatarId === avatar.id 
                                    ? '3px solid #4CAF50' 
                                    : '3px solid transparent',
                                backgroundColor: selectedAvatarId === avatar.id 
                                    ? '#e8f5e9' 
                                    : '#f5f5f5',
                                transition: 'all 0.2s ease',
                                textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedAvatarId !== avatar.id) {
                                    e.currentTarget.style.backgroundColor = '#e0e0e0';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedAvatarId !== avatar.id) {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }
                            }}
                        >
                            {/* style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: 'block',
                                    margin: '0 auto 8px'
                                }} */}
                            <Image
                                src={avatar.url}
                                alt={avatar.name}
                            />
                            <div style={{
                                fontSize: '12px',
                                color: '#666',
                                fontWeight: selectedAvatarId === avatar.id ? 'bold' : 'normal'
                            }}>
                                {avatar.name}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center'
                }}>
                    {/* style={{
                            padding: '12px 30px',
                            fontSize: '16px',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: selectedAvatarId ? '#4CAF50' : '#ccc',
                            color: 'white',
                            cursor: selectedAvatarId ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold'
                        }} */}
                    <Btn
                        msg={`✅ ${t('prof.select')}`}
                        disabled={!selectedAvatarId}
                        onClick={handleSelect}
                    />
                    {/* style={{
                            padding: '12px 30px',
                            fontSize: '16px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            backgroundColor: 'white',
                            color: '#666',
                            cursor: 'pointer'
                        }} */}
                    <Btn
                        msg={`❌ {t('prof.cancel')}`}
                        onClick={onCancel}
                    />
                </div>

                {avatars.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#999' }}>
                        {t('prof.no_avatars')}
                    </p>
                )}
            </div>
        </div>
    );
};