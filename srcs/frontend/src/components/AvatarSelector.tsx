// /srcs/frontend/src/components/AvatarSelector.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAvatarList, type AvatarInfo } from '../assets/avatars';

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
        //console.log('🎨 [AvatarSelector] Loaded avatars:', avatarList);
        //console.log('🎨 [AvatarSelector] Avatar IDs:', avatarList.map(a => a.id));
        
        // Pre-select current avatar if it's from the gallery
        if (currentAvatarUrl && !currentAvatarUrl.startsWith('http')) {
            const matchingAvatar = avatarList.find(a => a.id === currentAvatarUrl);
            if (matchingAvatar) {
                setSelectedAvatarId(matchingAvatar.id);
                //console.log('🎯 [AvatarSelector] Pre-selected current avatar:', matchingAvatar.id);
            }
        }
    }, [currentAvatarUrl]);

    const handleSelect = () => {
        if (selectedAvatarId) {
            //console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            //console.log('🔍 [AvatarSelector] STEP 1: User clicked Select');
            //console.log('🔍 [AvatarSelector] selectedAvatarId:', selectedAvatarId);
            //console.log('🔍 [AvatarSelector] Type:', typeof selectedAvatarId);
            
            // DEBUG: Show all avatar IDs to compare
            //console.log('🔍 [AvatarSelector] All available IDs:', avatars.map(a => a.id));
            
            // Find the avatar object
            const avatarObj = avatars.find(a => a.id === selectedAvatarId);
            
            //console.log('🔍 [AvatarSelector] Looking for ID:', selectedAvatarId);
            //console.log('🔍 [AvatarSelector] Found avatar object:', avatarObj);
            
            if (avatarObj) {
                //console.log('🔍 [AvatarSelector] STEP 2: Sending avatar ID:', avatarObj.id);
                //console.log('🔍 [AvatarSelector] Avatar URL is:', avatarObj.url);
                //console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                onSelect(avatarObj.id);
            } else {
                console.error('❌ [AvatarSelector] ERROR: Could not find avatar object for ID:', selectedAvatarId);
                console.error('❌ [AvatarSelector] Available avatars:', avatars);
                //console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            }
        } else {
            console.error('❌ [AvatarSelector] ERROR: No avatar selected!');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-1000 p-5">
            <div className="bg-white rounded-lg p-8 max-w-[800px] max-h-[90vh] overflow-auto shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <h2 className="mt-0 mb-5 text-center">
                    {t('prof.select_avatar')}
                </h2>

                <div className="grid grid-cols-[repeat(auto-fill,_minmax(120px,_1fr))] gap-4 mb-7">
                    {avatars.map((avatar) => (
                        <div
                            key={avatar.id}
                            onClick={() => {
                                //console.log('👆 [AvatarSelector] Clicked avatar:', avatar.id);
                                setSelectedAvatarId(avatar.id);
                            }}
                            className={`cursor-pointer p-2.5 rounded-xl ${selectedAvatarId === avatar.id ? 'border-3 border-[#4CAF50] bg-[#e8f5e9]' : 'border-3 border-transparent bg-[#f5f5f5]'} transition-all duration-200 ease-in-out text-center`}
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
                            <img
                                src={avatar.url}
                                alt={avatar.name}
                                className="w-[100px] h-[100px] rounded-full object-cover block mx-auto mb-2"
                            />
                            <div className={`text-[12px] text-[#666] ${selectedAvatarId === avatar.id ? 'font-bold' : 'font-normal'}`}>
                                {avatar.name}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 justify-center">
                    <button
                        onClick={handleSelect}
                        disabled={!selectedAvatarId}
                        className={`btn text-[16px] border-0 ${selectedAvatarId ? 'bg-green-500' : 'bg-gray-400 cursor-not-allowed'} text-white`}
                    >
                        ✅ {t('prof.select')}
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn text-base border border-gray-300 bg-white text-red-500"
                    >
                        ❌ {t('prof.cancel')}
                    </button>
                </div>

                {avatars.length === 0 && (
                    <p className="text-center text-gray-400">
                        {t('prof.no_avatars')}
                    </p>
                )}
            </div>
        </div>
    );
};
