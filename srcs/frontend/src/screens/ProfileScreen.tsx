import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { socket } from '../services/socketService';
import { 
    getMyFriends, 
    getPendingRequests, 
    acceptFriendRequest, 
    getUsersToInvite,
    sendFriendRequest,
    type Friend, 
    type PendingRequest, 
    type UserCandidate,
    removeFriend
} from '../services/friend.service';
import { checkForm } from '../ts/utils/auth';
import {
    getMyProfile, 
    updateMyProfile, 
    getCountries,
    deleteMyAccount,
    type UserProfile,
    type Country,
    type UpdateProfileData
} from '../services/user.service';
import { useModal } from '../context/ModalContext';
import { Avatar } from '../components/Avatar';
import { AvatarSelector } from '../components/AvatarSelector';
import { firstcap } from '../ts/utils/string';
import { sentence  } from '../ts/utils/string';
import { useCountryNames } from '../ts/utils/countryName';
import { getAvatarUrlById, getDefaultAvatar } from '../assets/avatars';
import { Leaderboard } from '../components/Leaderboard';
import { MatchHistory } from '../components/MatchHistory';

// To update header if user changes the nick
interface ProfileScreenProps {
    setGlobalUser: (nick: string) => void;
    setGlobalUserId: (id: number) => void;
    setGlobalAvatarUrl: (url: string | null) => void;
}

const ProfileScreen = ({ setGlobalUser, setGlobalUserId, setGlobalAvatarUrl }: ProfileScreenProps) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'info' | 'friends' | 'requests' | 'stats'>('info');
    
    // Localised country name resolver — updates automatically when language changes
    const countryName = useCountryNames();

    // Estados de datos sociales
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [candidates, setCandidates] = useState<UserCandidate[]>([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
    
    // Estados para perfil de usuario
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados para formulario de edición
    const [editForm, setEditForm] = useState({
        nick: '',
        email: '',
        birth: '',
        country: '',
        lang: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    // Estados para países
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    
    // Estado para añadir amigo
    const [targetIdInput, setTargetIdInput] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);

    // Estado para el sub-menú de estadísticas
    const [statView, setStatView] = useState<'leaderboard' | 'history' | 'grafana'>('leaderboard');
    
    const { showModal } = useModal();

    // --- CARGA DE DATOS ---

    const loadUserProfile = async () => {
        console.log("🔄 [ProfileScreen] loadUserProfile() - Starting...");
        
        try {
            setIsLoadingProfile(true);
            const profile = await getMyProfile();
            
            if (!profile) {
                console.error("❌ [ProfileScreen] No profile data received");
                throw new Error(t('prof.prof_no_load'));
            }

            console.log("✅ [ProfileScreen] Profile loaded:", profile);
            setUserProfile(profile);
            
            // Sync header with the real profile data from the DB
            setGlobalUserId(profile.id);
            setGlobalAvatarUrl(profile.avatarUrl ?? null);
            
            // Inicializar formulario de edición con datos actuales
            setEditForm({
                nick: profile.nick || '',
                email: profile.email || '',
                birth: profile.birth || '',
                country: profile.country || '',
                lang: profile.lang || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            console.log("✅ [ProfileScreen] Edit form initialized");
        } catch (error) {
            console.error('❌ [ProfileScreen] Error loading user profile:', error);
            showModal({
                title: t('error'),
                message: t('prof.prof_no_load'),
                type: "error"
            });
        } finally {
            setIsLoadingProfile(false);
            console.log("🏁 [ProfileScreen] loadUserProfile() - Finished");
        }
    };

    const loadCountries = async () => {
        console.log("🔄 [ProfileScreen] loadCountries() - Starting...");
        
        try {
            setIsLoadingCountries(true);
            const countriesData = await getCountries();
            
            console.log("✅ [ProfileScreen] Countries loaded:", countriesData.length);
            setCountries(countriesData);
        } catch (error) {
            console.error('❌ [ProfileScreen] Error loading countries:', error);
        } finally {
            setIsLoadingCountries(false);
            console.log("🏁 [ProfileScreen] loadCountries() - Finished");
        }
    };

    const loadSocialData = async () => {
        console.log("🔄 [ProfileScreen] loadSocialData() - Starting...");
        
        try {
            const f = await getMyFriends();
            console.log("📦 [ProfileScreen] Friends loaded:", f.length); 
            setFriends(f);
            
            const r = await getPendingRequests();
            console.log("📨 [ProfileScreen] Requests loaded:", r.length);
            setRequests(r);

            setIsLoadingCandidates(true);
            const c = await getUsersToInvite();
            console.log("👥 [ProfileScreen] Candidates loaded:", c.length);
            setCandidates(c);

        } catch (e) {
            console.error("❌ [ProfileScreen] Error loading social data:", e);
        } finally {
            setIsLoadingCandidates(false);
            console.log("🏁 [ProfileScreen] loadSocialData() - Finished");
        }
    };

    const handleAvatarSelect = async (newAvatarUrl: string) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 [ProfileScreen] STEP 3: handleAvatarSelect called');
        console.log('🔍 [ProfileScreen] Received value:', newAvatarUrl);
        console.log('🔍 [ProfileScreen] Value type:', typeof newAvatarUrl);
        console.log('🔍 [ProfileScreen] Is it an ID or URL?', newAvatarUrl.startsWith('http') ? 'URL' : 'ID');
        
        try {
            // Prepare update data with the new avatar
            const updateData: UpdateProfileData = {
                nick: userProfile!.nick,
                email: userProfile!.email,
                birth: userProfile!.birth,
                country: userProfile!.country,
                lang: userProfile!.lang,
                avatarUrl: newAvatarUrl
            };
    
            console.log('🔍 [ProfileScreen] STEP 4: Prepared updateData:');
            console.log(JSON.stringify(updateData, null, 2));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
            const result = await updateMyProfile(updateData);
    
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 [ProfileScreen] STEP 5: Backend response:');
            console.log('🔍 [ProfileScreen] Result.ok:', result.ok);
            console.log('🔍 [ProfileScreen] Result.msg:', result.msg);
            console.log('🔍 [ProfileScreen] Full result:', result);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
            if (result.ok) {
                console.log('✅ [ProfileScreen] STEP 6: Update successful!');
                console.log('🔍 [ProfileScreen] Updating local state with:', newAvatarUrl);
                
                setUserProfile(prev => {
                    const updated = prev ? { ...prev, avatarUrl: newAvatarUrl } : null;
                    console.log('🔍 [ProfileScreen] New userProfile state:', updated);
                    return updated;
                });
                
                // Sync the new avatar to the Header immediately
                setGlobalAvatarUrl(newAvatarUrl);
                
                console.log('🔍 [ProfileScreen] STEP 7: Closing modal');
                setIsSelectingAvatar(false);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            } else {
                console.error('❌ [ProfileScreen] STEP 6: Update FAILED!');
                console.error('❌ [ProfileScreen] Error message:', result.msg);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                showModal({
                    title: t('error'),
                    message: result.msg || t('prof.avatar_update_error'),
                    type: "error"
                });
            }
        } catch (error) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ [ProfileScreen] STEP 6: Exception caught!');
            console.error('❌ [ProfileScreen] Error:', error);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            showModal({
                title: t('error'),
                message: t('prof.avatar_update_error2'),
                type: "error"
            });
        }
    };

    const handleRemoveFriend = (friendId: number, friendName: string) => {
        console.log(`🗑️ [ProfileScreen] Removing friend: ${friendName} (ID: ${friendId})`);
        
        showModal({
            title: t('prof.del_friend'),
            message: t('prof.conf_del_friend', { name: friendName }),
            type: "confirm",
            onConfirm: async () => {
                console.log("✅ [ProfileScreen] User confirmed friend removal");
                
                setFriends((prev: Friend[]) => prev.filter((f) => Number(f.id) !== Number(friendId)));

                try {
                    const res = await removeFriend(friendId);
                    
                    if (res.ok) {
                        console.log("✅ [ProfileScreen] Friend removed successfully");
                        setStatusMsg(t('prof.friend_removed_msg', { name: friendName }));
                    } else {
                        console.error("❌ [ProfileScreen] Failed to remove friend, reloading...");
                        loadSocialData(); 
                    }
                } catch (error) {
                    console.error("❌ [ProfileScreen] Error removing friend:", error);
                }
                
                setTimeout(() => loadSocialData(), 300);
            }
        });
    };

    const handleUpdateProfile = async () => {
        console.log("💾 [ProfileScreen] handleUpdateProfile() - Starting...");
        console.log("📝 [ProfileScreen] Form data:", editForm);
    
        // Format validation via checkForm (email format, birth date, new password strength)
        const formResult = checkForm(
            editForm.nick,
            editForm.email,
            editForm.newPassword,
            editForm.confirmPassword,
            editForm.birth,
            { requirePassword: false }
        );
        if (!formResult.ok) {
            console.warn("⚠️ [ProfileScreen] Validation failed:", formResult.msg);
            showModal({
                title: t('error'),
                message: t(formResult.msg),
                type: "error"
            });
            return;
        }
    
        // Current password required if changing password
        if (editForm.newPassword && !editForm.currentPassword) {
            console.warn("⚠️ [ProfileScreen] Validation failed: Missing current password");
            showModal({
                title: t('error'),
                message: t('prof.need_current_pass'),
                type: "error"
            });
            return;
        }
    
        // Sync nick to localStorage and header if changed
        if (editForm.nick !== userProfile?.nick) {
            console.log("🔄 [ProfileScreen] Updating localStorage with new nick:", editForm.nick);
            localStorage.setItem('pong_user_nick', editForm.nick);
            setGlobalUser(editForm.nick);
        }
    
        try {
            const updateData: UpdateProfileData = {
                nick: editForm.nick,
                email: editForm.email,
                birth: editForm.birth,
                country: editForm.country,
                lang: editForm.lang,
                avatarUrl: userProfile!.avatarUrl ?? undefined
            };
    
            if (editForm.newPassword) {
                updateData.currentPassword = editForm.currentPassword;
                updateData.newPassword = editForm.newPassword;
                console.log("🔐 [ProfileScreen] Including password change in update");
            }
    
            console.log("📡 [ProfileScreen] Sending update request...");
            const result = await updateMyProfile(updateData);
    
            if (!result.ok) {
                console.error("❌ [ProfileScreen] Update failed:", result.msg);
                throw new Error(result.msg || t('prof.update_error'));
            }
    
            console.log("✅ [ProfileScreen] Profile updated successfully");
    
            showModal({
                title: t('prof.update_success_title'),
                message: t('prof.update_success_msg'),
                type: "error"
            });
    
            await loadUserProfile();
            setIsEditing(false);
    
            setEditForm(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
    
            console.log("🏁 [ProfileScreen] handleUpdateProfile() - Success");
    
        } catch (error: any) {
            console.error('❌ [ProfileScreen] Error updating profile:', error);
            showModal({
                title: t('error'),
                message: t(error.message) || t('prof.update_error'),
                type: "error"
            });
        }
    };

    const handleCancelEdit = () => {
        console.log("❌ [ProfileScreen] User cancelled edit mode");
        
        if (!userProfile) return;
        
        // Restaurar valores originales
        setEditForm({
            nick: userProfile.nick || '',
            email: userProfile.email || '',
            birth: userProfile.birth || '',
            country: userProfile.country || '',
            lang: userProfile.lang || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setIsEditing(false);
        
        console.log("✅ [ProfileScreen] Form reset to original values");
    };
    
    const handleDeleteAccount = () => {
        showModal({
            title: sentence(t('prof.delete_btn')),
            message: t('prof.delete_account_confirm'),
            type: "confirm",
            onConfirm: async () => {
                console.log("🗑️ [ProfileScreen] User confirmed account deletion");

                const result = await deleteMyAccount();

                if (result.ok) {
                    window.location.href = '/';
                } else {
                    showModal({
                        title: t('error'),
                        message: result.msg || t('prof.delete_account_error'),
                        type: "error"
                    });
                }
            }
        });
    };

    // Cargar datos al montar
    useEffect(() => {
        console.log("🚀 [ProfileScreen] Component mounted - Loading initial data...");
        
        loadUserProfile();
        loadCountries();
        loadSocialData();

        // --- HANDLERS DE SOCKET ---
        const handleNewRequest = () => {
            console.log("📩 [SOCKET] Nueva solicitud recibida");
            setTimeout(() => loadSocialData(), 300);
        };

        const handleFriendAccepted = () => {
            console.log("🤝 [SOCKET] Amistad aceptada");
            setTimeout(() => {
                loadSocialData();
                setStatusMsg(t('prof.friend_added'));
            }, 300);
        };

        const handleStatusChange = (data: { userId: number, status: 'online' | 'offline' }) => {
            console.log(`👤 [SOCKET] User status changed: ${data.userId} -> ${data.status}`);
            setFriends((prev: Friend[]) => prev.map((f) => {
                if (Number(f.id) === Number(data.userId)) {
                    return { ...f, status: data.status };
                }
                return f;
            }));
        };

        const handleFriendRemoved = (data: any) => {
            console.log("🚨 [SOCKET] Evento 'friend_removed' llegó con datos:", data);

            if (!data || !data.from) {
                console.error("❌ El evento llegó sin ID 'from'");
                return;
            }

            const idQueMeBorro = Number(data.from);
            console.log(`🔪 Intentando borrar al usuario ID ${idQueMeBorro} de mi lista local...`);

            setFriends((prev: Friend[]) => {
                const cantidadAntes = prev.length;
                const nuevaLista = prev.filter(f => Number(f.id) !== idQueMeBorro);
                console.log(`📉 Cambio visual: ${cantidadAntes} amigos -> ${nuevaLista.length} amigos`);
                return nuevaLista;
            });
            
            loadSocialData();
        };

        // para el avatar
        const handleFriendUpdate = (payload: any) => {
            console.log("♻️ [SOCKET] Evento friend_update recibido en Perfil:", payload);

            setFriends((prevFriends) => prevFriends.map((f) => {
                if (Number(f.id) === Number(payload.id)) {
                    console.log(`🔄 Actualizando datos de amigo: ${f.friend_nick} -> ${payload.name}`);
                    return {
                        ...f,
                        friend_nick: payload.name || f.friend_nick,
                        avatar: payload.avatar
                    } as any;
                }
                return f;
            }));
        };

        // --- SUSCRIPCIONES ---
        console.log("🎧 Suscribiéndose a eventos del socket...");
        socket.on('friend_request', handleNewRequest);
        socket.on('friend_accepted', handleFriendAccepted);
        socket.on('user_status', handleStatusChange);
        socket.on('friend_removed', handleFriendRemoved);
        socket.on('friend_update', handleFriendUpdate);

        // --- CLEANUP ---
        return () => {
            console.log("🔕 Desuscribiéndose eventos del socket...");
            socket.off('friend_request', handleNewRequest);
            socket.off('friend_accepted', handleFriendAccepted);
            socket.off('user_status', handleStatusChange);
            socket.off('friend_removed', handleFriendRemoved);
            socket.off('friend_update', handleFriendUpdate);
        };
    }, []);

    const handleSendRequest = async () => {
        if (!targetIdInput) return;
        
        console.log("📤 [ProfileScreen] Sending friend request to:", targetIdInput);
        
        setIsLoadingCandidates(true);
        const res = await sendFriendRequest(parseInt(targetIdInput));
        setStatusMsg(res.ok ? t('prof.request_sent') : t('error'));
        
        console.log("📬 [ProfileScreen] Friend request result:", res);
        
        setTargetIdInput("");
        loadSocialData();
    };

    const handleAccept = async (id: number) => {
        console.log("✅ [ProfileScreen] Accepting friend request:", id);
        
        setRequests((prev: PendingRequest[]) => prev.filter((r) => r.id !== id));
        await acceptFriendRequest(id);

        setTimeout(() => {
            loadSocialData();
        }, 300);
    };

    // Función auxiliar para resolver la imagen (igual que en ChatSidebar)
    const getDisplayAvatar = (userId: number, avatarId?: string | null) => {
        if (!avatarId) return getDefaultAvatar(userId);
        if (avatarId.startsWith('http') || avatarId.startsWith('/')) return avatarId;
        const customUrl = getAvatarUrlById(avatarId);
        if (customUrl) return customUrl;
        return getDefaultAvatar(userId);
    };


    // --- COMPONENTES DE PANTALLA ---

    const renderInfoScreen = () => {
        if (isLoadingProfile) {
            console.log("⏳ [InfoScreen] Loading profile...");
            return <p>{t('prof.loading')}</p>;
        }

        if (!userProfile) {
            console.error("❌ [InfoScreen] No profile data available");
            return <p>{t('prof.load_error')}</p>;
        }

        const isOAuthUser = !!userProfile.oauthProvider;
        console.log("👤 [InfoScreen] Rendering profile. OAuth user:", isOAuthUser);

        return (
            <div className="h-[840px] w-full overflow-y-auto">
                <h1>{t('prof.title')}</h1>

                {/* Avatar with Edit Button */}
                    <div className="text-center mb-[20px]">
                        <Avatar 
                            src={userProfile.avatarUrl}
                            userId={userProfile.id}
                            size={150}
                            alt={userProfile.nick}
                        />
                        
                        <div className="mt-4">
                            <button
                                onClick={() => {
                                    console.log("🖼️ [ProfileScreen] Opening avatar selector");
                                    setIsSelectingAvatar(true);
                                }}
                                className="btn border border-[#4CAF50] bg-white text-[#4CAF50] font-bold"
                            >
                                {t('prof.edit_image')}
                            </button>
                        </div>
                    </div>

                {!isEditing ? (
                    // MODO VISUALIZACIÓN
                    <>
                        <div className="mb-2.5">
                            <strong>{t('prof.field_id')}:</strong> {userProfile.id} {/* Added Translation key */}
                        </div>
                        <div className="mb-2.5">
                            <strong>{t('user')}:</strong> {userProfile.nick}
                        </div>
                        <div className="mb-2.5">
                            <strong>{t('prof.field_email')}:</strong> {userProfile.email}
                        </div>
                        {userProfile.birth && (
                            <div className="mb-2.5">
                                <strong>{t('cumple')}:</strong> {userProfile.birth} {/* Added Translation key */}
                            </div>
                        )}
                        <div className="mb-2.5">
                            <strong>{t('prof.field_country')}:</strong> {userProfile.country} {/* Added Translation key */}
                        </div>
                        <div className="mb-2.5">
                            <strong>{t('lang')}:</strong> {userProfile.lang} {/* Added Translation key */}
                        </div>
                        {isOAuthUser && (
                            <div className="mb-2.5">
                                <strong>{t('prof.field_oauth')}:</strong> {userProfile.oauthProvider} {/* Added Translation key */}
                            </div>
                        )}

                        <button
                            onClick={() => {
                            console.log("✏️ [InfoScreen] Entering edit mode");
                            setIsEditing(true);
                            }}
                            className="btn mt-5 text-sm border border-[#4CAF50] bg-white text-[#4CAF50]"
                        >
                            {t('prof.edit_btn')} {/* Added Translation key */}
                        </button>
                        <button
                                onClick={() => {
                                    handleDeleteAccount();
                                }}
                                className="btn ml-1 text-sm border border-[#D93814] bg-white text-[#D93814]"
                                
                            >
                                {sentence(t('prof.delete_btn'))}
                        </button>
                    </>
                ) : (
                    // MODO EDICIÓN
                    <>
                        <div className="mb-2.5">
                            <strong>{t('prof.field_id')}:</strong> {userProfile.id} <em>({t('prof.field_id_readonly')})</em> {/* Added Translation key */}
                        </div>

                        <div className="mb-3.5">
                            <label className="label-white">
                                <strong>{t('user')}:</strong>
                            </label>

                            <input
                                className="input-white"
                                type="text"
                                value={editForm.nick}
                                onChange={(e) => setEditForm({ ...editForm, nick: e.target.value })}
                            />
                        </div>

                        <div className="mb-3.5">
                            <label className="label-white">
                                <strong>{t('prof.field_email')}:</strong>
                            </label>

                            <input
                                className="input-white"
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                        </div>

                        <div className="mb-3.5">
                            <label className="label-white">
                                <strong>{t('cumple')}:</strong>
                            </label>
                            <input
                                className="input-white"
                                type="date"
                                value={editForm.birth}
                                onChange={(e) => setEditForm({ ...editForm, birth: e.target.value })}
                            />
                        </div>

                        <div className="mb-3.5">
                            <label className="label-white">
                                <strong>{t('prof.field_country')}:</strong>
                            </label>
                            <select
                                className="select-white"
                                value={editForm.country}
                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                disabled={isLoadingCountries}>
                                <option value="">
                                    {isLoadingCountries ? t('prof.loading_countries') : t('prof.sel_country')}
                                </option>
                                {countries.map((c) => (
                                    <option key={c.coun2_pk} value={c.coun2_pk}>
                                        {countryName(c.coun2_pk, c.coun_name)} ({c.coun2_pk})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3.5">
                            <label className="label-white">
                                <strong>{t('lang')}:</strong>
                            </label>
                            <select
                                className="select-white"
                                value={editForm.lang}
                                onChange={(e) => setEditForm({ ...editForm, lang: e.target.value })}
                            >    
                                <option value="">{t('prof.sel_lang')}</option> {/* Added Translation key */}
                                <option value="es">Español</option>
                                <option value="ca">Català</option>
                                <option value="en">English</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>

                        {/* Cambio de contraseña - Solo para usuarios NO OAuth */}
                        {!isOAuthUser && (
                            <>
                                <hr className="my-5"/>
                                <h3>{t('prof.change_pass')}</h3> {/* Added Translation key */}

                                <div className="mb-3.5">
                                    <label className="label-white">
                                        <strong>{t('prof.current_pass')}:</strong>
                                    </label>
                                    <input
                                        className="input-white"
                                        type="password"
                                        value={editForm.currentPassword}
                                        onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                                        placeholder={t('prof.current_pass_ph')} // Added Translation key
                                    />
                                </div>

                                <div className="mb-3.5">
                                    <label className="label-white">
                                        <strong>{t('prof.new_pass')}:</strong>
                                    </label>
                                    <input
                                        className="input-white"
                                        type="password"
                                        value={editForm.newPassword}
                                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                                        placeholder={t('prof.new_pass_ph')} // Added Translation key
                                    />
                                </div>

                                <div className="mb-3.5">
                                    <label className="label-white">
                                        <strong>{t('prof.confirm_pass')}:</strong>
                                    </label>
                                    <input
                                        className="input-white"
                                        type="password"
                                        value={editForm.confirmPassword}
                                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                                        placeholder={t('prof.confirm_pass_ph')} // Added Translation key
                                    />
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button className="btn bg-[hsl(139,68%,37%)] text-white" onClick={handleUpdateProfile}>
                                {t('prof.save_btn')} {/* Added Translation key */}
                            </button>
                            <button className="btn bg-red-500 text-white" onClick={handleCancelEdit}>
                                {t('prof.cancel')} {/* Added Translation key */}
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderFriendScreen = () => {
        // Buscamos el usuario seleccionado en el desplegable para mostrar su avatar
        const selectedCandidate = candidates.find(c => String(c.id) === String(targetIdInput));

        return (
            <>
                <h1>{firstcap(t('prof.friends_title'))}</h1>

                <div className="mb-7.5 p-4 bg-[#f5f5f5] rounded-lg">
                    <label>
                        {t('prof.invite_label')}
                    </label>
                    
                    <div className="flex items-center gap-3.5">
                        {/* Selector */}
                        <select
                            className="select-black"
                            value={targetIdInput}
                            onChange={(e) => setTargetIdInput(e.target.value)}
                            disabled={isLoadingCandidates}
                        >
                            <option value="">
                                {isLoadingCandidates ? t('prof.loading_users') : t('prof.sel_player')}
                            </option>
                            {candidates.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.nick}
                                </option>
                            ))}
                        </select>

                        {/* Previsualización del Avatar Seleccionado */}
                        {selectedCandidate && (
                            <div className="w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-[#ddd]">
                                <img 
                                    src={getDisplayAvatar(selectedCandidate.id, (selectedCandidate as any).avatar)} 
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleSendRequest}
                            disabled={!targetIdInput || isLoadingCandidates}
                            className="btn"
                        >
                            {t('prof.send_request_btn')}
                        </button>
                    </div>
                </div>

                {statusMsg && <p className="mb-3.5 text-[#22c55e]">{statusMsg}</p>}

                <h3>{sentence(t('prof.friends_title'))}</h3>
                
                {friends.length === 0 ? (
                    <p>{t('prof.no_friends')}</p>
                ) : (
                    <ul className="list-none p-0 mt-5">
                        {friends.map((f, i) => (
                            <li key={i} className="list-none flex justify-between items-center p-2.5 border-b border-[#eee]">
                                <div className="flex items-center gap-[12px]">
                                    {/* 1. Semáforo */}
                                    <div className={`w-[10px] h-[10px] rounded-full ${f.status === 'online' ? 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]' : 'bg-[#6b7280] shadow-none'}`}></div>

                                    {/* 2. Avatar (NUEVO) */}
                                    <div className="w-[40px] h-[40px] rounded-full overflow-hidden">
                                        <img 
                                            src={getDisplayAvatar(f.id, (f as any).avatar)} 
                                            alt={f.friend_nick}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* 3. Nombre */}
                                    <span className="font-medium text-[1.1rem]">
                                        {f.friend_nick}
                                    </span>
                                </div>

                                <button 
                                    onClick={() => handleRemoveFriend(f.id, f.friend_nick)}
                                    className="btn bg-[#ef4444] text-white border-0"
                                >
                                    {t('prof.remove_btn')}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </>
        );
    };   
    
    const renderRequestScreen = () => (
        <>
            <h1>{t('prof.requests_title')}</h1>
            <h3>{t('prof.requests_h3')}</h3>
            {requests.length === 0 && <p>{t('prof.no_requests')}</p>}
            {requests.length > 0 && (
                <ul>
                    {requests.map((r) => (
                        <li key={r.id}>
                            <span>
                                <strong>{r.nick}</strong> {t('prof.wants_friend')}
                            </span>
                            <div>
                                <button className="btn" onClick={() => handleAccept(r.id)}>
                                    {sentence(t('prof.accept_btn'))} {/* Added Translation key */}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    const renderStatScreen = () => {
        const btnBaseStyle = "px-4 py-2 rounded-md font-bold transition-colors duration-200 shadow-md";
        const btnActiveStyle = "bg-cyan-600 text-white border border-cyan-400";
        const btnInactiveStyle = "bg-gray-800 text-gray-400 border border-gray-600 hover:bg-gray-700 hover:text-white";

        return (
            <div className="flex flex-col items-center mt-5 w-full">
                {/* Título de la sección */}
                <h1 className="text-[2rem] font-bold text-white mb-5">
                    {t('prof.stats_title')}
                </h1>
                
                {/* 🎛️ SUB-MENÚ DE BOTONES */}
                <div className="flex gap-[15px] mb-[30px] flex-wrap justify-center">
                    <button 
                        onClick={() => setStatView('leaderboard')}
                        className={`${btnBaseStyle} ${statView === 'leaderboard' ? btnActiveStyle : btnInactiveStyle}`}
                    >
                        🏆 Top 10
                    </button>
                    <button 
                        onClick={() => setStatView('history')}
                        className={`${btnBaseStyle} ${statView === 'history' ? btnActiveStyle : btnInactiveStyle}`}
                    >
                        📜 {t('prof.history')}
                    </button>
                    <button 
                        onClick={() => setStatView('grafana')}
                        className={`${btnBaseStyle} ${statView === 'grafana' ? btnActiveStyle : btnInactiveStyle}`}
                    >
                        📊 {t('prof.analytics')}
                    </button>
                </div>

                {/* 📺 CONTENIDO DINÁMICO QUE CAMBIA SEGÚN EL BOTÓN */}
                <div className="w-full flex justify-center">
                    {statView === 'leaderboard' && (
                        <Leaderboard />
                    )}
                    
                    {statView === 'history' && (
                        <MatchHistory myProfile={userProfile} />
                    )}
                    
                    {statView === 'grafana' && (
                        <div className="w-full h-[700px] bg-[#111827] rounded-lg overflow-hidden border border-[#374151] mt-2.5">
                            <iframe  
                                src="https://localhost:8443/grafana/d/grhk4qc/transcendence-db-pong?orgId=1&from=now-6h&to=now&timezone=browser&kiosk"
                                width="100%" 
                                height="100%" 
                                frameBorder="0"
                                title="Grafana Analytics"
                                className="pointer-events-auto"
                            ></iframe>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const selectedCss = "bg-blue-500 border-b-4 border-azure pointer-events-none";

    return (
        <main className="w-full h-[79vh] grid grid-cols-[150px_1fr] lg:grid-cols-[150px_1fr_320px]">
            <nav className="h-[79vh] bg-[hsl(139,68%,37%)]">
                <ul className="pt-4">
                    <li
                        onClick={() => setActiveTab("info")}
                        className={`li ${activeTab === "info" ? selectedCss : ""}`}>
                        {t('prof.tab_info')} {/* Added Translation key */}
                    </li>
                    <li
                        onClick={() => setActiveTab("friends")}
                        className={`li ${activeTab === "friends" ? selectedCss : ""}`}>
                        {t('prof.tab_friends', { count: friends.length })}
                    </li>
                    <li
                        onClick={() => setActiveTab("requests")}
                        className={`li ${activeTab === "requests" ? selectedCss : ""}`}>
                        {t('prof.tab_requests', { count: requests.length })}
                    </li>
                    <li
                        onClick={() => setActiveTab("stats")}
                        className={`li ${activeTab === "stats" ? selectedCss : ""}`}>
                        {t('prof.tab_stats')} {/* Added Translation key */}
                    </li>
                </ul>
            </nav>

            <section className="bg-black overflow-y-auto">
                <div className="w-[90%] mx-auto text-[#a1bdf3]">
                    {activeTab === 'info' && renderInfoScreen()}
                    {activeTab === 'friends' && renderFriendScreen()}
                    {activeTab === 'requests' && renderRequestScreen()}
                    {activeTab === 'stats' && renderStatScreen()}
                </div>
            </section>

            <div className="bg-[#2d2979]"></div>
            {/* Avatar Selector Modal */}
            {isSelectingAvatar && (
                <AvatarSelector
                    currentAvatarUrl={userProfile?.avatarUrl}
                    onSelect={handleAvatarSelect}
                    onCancel={() => {
                        console.log("❌ [ProfileScreen] Avatar selection cancelled");
                        setIsSelectingAvatar(false);
                    }}
                />
            )}
        </main>
    );
};

export default ProfileScreen;