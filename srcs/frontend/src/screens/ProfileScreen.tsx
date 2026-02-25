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
import "../css/ProfileScreen.css";
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
                type: "alert"
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
                    title: t('error'), // Added Translation key
                    message: result.msg || t('prof.avatar_update_error'), // Added Translation key
                    type: "alert"
                });
            }
        } catch (error) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ [ProfileScreen] STEP 6: Exception caught!');
            console.error('❌ [ProfileScreen] Error:', error);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            showModal({
                title: t('error'), // Added Translation key
                message: t('prof.avatar_update_error2'), // Added Translation key
                type: "alert"
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
                        setStatusMsg(t('prof.friend_removed_msg', { name: friendName })); // Added Translation key
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

        // Validaciones
        if (!editForm.nick || !editForm.email) {
            console.warn("⚠️ [ProfileScreen] Validation failed: Missing required fields");
            showModal({
                title: t('error'), // Added Translation key
                message: t('prof.fields_required'), // Added Translation key
                type: "confirm"
            });
            return;
        }

        if (editForm.nick !== userProfile?.nick) {
            console.log("🔄 [ProfileScreen] Updating localStorage with new nick:", editForm.nick);
            localStorage.setItem('pong_user_nick', editForm.nick);
            
            // 🔥 NEW: Update the global App state (Header) immediately
            setGlobalUser(editForm.nick); 
        }

        // Si quiere cambiar contraseña, validar
        if (editForm.newPassword) {
            console.log("🔐 [ProfileScreen] Password change requested");
            
            if (!editForm.currentPassword) {
                console.warn("⚠️ [ProfileScreen] Validation failed: Missing current password");
                showModal({
                    title: t('error'), // Added Translation key
                    message: t('prof.need_current_pass'), // Added Translation key
                    type: "confirm"
                });
                return;
            }
            if (editForm.newPassword !== editForm.confirmPassword) {
                console.warn("⚠️ [ProfileScreen] Validation failed: Passwords don't match");
                showModal({
                    title: t('error'), // Added Translation key
                    message: t('prof.pass_mismatch'), // Added Translation key
                    type: "confirm"
                });
                return;
            }
            if (editForm.newPassword.length < 6) {
                console.warn("⚠️ [ProfileScreen] Validation failed: Password too short");
                showModal({
                    title: t('error'), // Added Translation key
                    message: t('prof.pass_too_short'), // Added Translation key
                    type: "confirm"
                });
                return;
            }
        }

        try {
            const updateData: UpdateProfileData = {
                nick: editForm.nick,
                email: editForm.email,
                birth: editForm.birth,
                country: editForm.country,
                lang: editForm.lang,
                // Always carry the current avatarUrl forward so saving text fields
                // never accidentally clears the avatar that was set separately.
                avatarUrl: userProfile!.avatarUrl ?? undefined
            };

            // Solo incluir contraseñas si se está intentando cambiar
            if (editForm.newPassword) {
                updateData.currentPassword = editForm.currentPassword;
                updateData.newPassword = editForm.newPassword;
                console.log("🔐 [ProfileScreen] Including password change in update");
            }

            console.log("📡 [ProfileScreen] Sending update request...");
            const result = await updateMyProfile(updateData);

            if (!result.ok) {
                console.error("❌ [ProfileScreen] Update failed:", result.msg);
                throw new Error(result.msg || t('prof.update_error')); // Added Translation key
            }

            console.log("✅ [ProfileScreen] Profile updated successfully");

            // Actualizar localStorage si cambió el nick
            if (editForm.nick !== userProfile?.nick) {
                console.log("🔄 [ProfileScreen] Updating localStorage with new nick:", editForm.nick);
                localStorage.setItem('pong_user_nick', editForm.nick);
            }

            showModal({
                title: t('prof.update_success_title'), // Added Translation key
                message: t('prof.update_success_msg'), // Added Translation key
                type: "confirm"
            });

            // Recargar perfil y salir del modo edición
            await loadUserProfile();
            setIsEditing(false);
            
            // Limpiar campos de contraseña
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
                title: t('error'), // Added Translation key
                message: error.message || t('prof.update_error'), // Added Translation key
                type: "confirm"
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
                        type: "alert"
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
                setStatusMsg(t('prof.friend_added')); // Added Translation key
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
        //para el avatar
        const handleFriendUpdate = (payload: any) => {
            console.log("♻️ [SOCKET] Evento friend_update recibido en Perfil:", payload);

            setFriends((prevFriends) => prevFriends.map((f) => {
                // Comparamos IDs (asegurando tipo número)
                if (Number(f.id) === Number(payload.id)) {
                    console.log(`🔄 Actualizando datos de amigo: ${f.friend_nick} -> ${payload.name}`);
                    return {
                        ...f,
                        friend_nick: payload.name || f.friend_nick, // Actualizar Nick
                        avatar: payload.avatar // 🔥 Actualizar Avatar (URL o ID)
                    } as any; // 'as any' para evitar quejas si la interfaz Friend no tiene 'avatar' explícito aún
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
        setStatusMsg(res.msg || (res.ok ? t('prof.request_sent') : t('error'))); // Added Translation key
        
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
        // Si es URL externa (42/Google)
        if (avatarId.startsWith('http') || avatarId.startsWith('/')) return avatarId;
        // Si es un ID local (ej: dragon-egg)
        const customUrl = getAvatarUrlById(avatarId);
        if (customUrl) return customUrl;
        // Fallback
        return getDefaultAvatar(userId);
    };


    // --- COMPONENTES DE PANTALLA ---

    const renderInfoScreen = () => {
        if (isLoadingProfile) {
            console.log("⏳ [InfoScreen] Loading profile...");
            return <p>{t('prof.loading')}</p>; // Added Translation key
        }

        if (!userProfile) {
            console.error("❌ [InfoScreen] No profile data available");
            return <p>{t('prof.load_error')}</p>; // Added Translation key
        }

        const isOAuthUser = !!userProfile.oauthProvider;
        console.log("👤 [InfoScreen] Rendering profile. OAuth user:", isOAuthUser);

        


        return (
            <>
                <h1>{t('prof.title')}</h1> {/* Added Translation key */}

                {/* Avatar with Edit Button */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <Avatar 
                            src={userProfile.avatarUrl}
                            userId={userProfile.id}
                            size={150}
                            alt={userProfile.nick}
                        />
                        
                        <div style={{ marginTop: '15px' }}>
                            <button
                                onClick={() => {
                                    console.log("🖼️ [ProfileScreen] Opening avatar selector");
                                    setIsSelectingAvatar(true);
                                }}
                                style={{
                                    width: '200px',
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '5px',
                                    border: '1px solid #4CAF50',
                                    backgroundColor: 'white',
                                    color: '#4CAF50',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {t('prof.edit_image')}
                            </button>
                        </div>
                    </div>

                {!isEditing ? (
                    // MODO VISUALIZACIÓN
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>{t('prof.field_id')}:</strong> {userProfile.id} {/* Added Translation key */}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>{t('user')}:</strong> {userProfile.nick}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>Email:</strong> {userProfile.email}
                        </div>
                        {userProfile.birth && (
                            <div style={{ marginBottom: '10px' }}>
                                <strong>{t('cumple')}:</strong> {userProfile.birth} {/* Added Translation key */}
                            </div>
                        )}
                        <div style={{ marginBottom: '10px' }}>
                            <strong>{t('prof.field_country')}:</strong> {userProfile.country} {/* Added Translation key */}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>{t('lang')}:</strong> {userProfile.lang} {/* Added Translation key */}
                        </div>
                        {isOAuthUser && (
                            <div style={{ marginBottom: '10px' }}>
                                <strong>{t('prof.field_oauth')}:</strong> {userProfile.oauthProvider} {/* Added Translation key */}
                            </div>
                        )}

                        <button
                                onClick={() => {
                                console.log("✏️ [InfoScreen] Entering edit mode");
                                setIsEditing(true);
                                }}
                                style={{
                                    width: '200px',
                                    padding: '8px 20px',
                                    marginTop: '20px',
                                    fontSize: '14px',
                                    borderRadius: '5px',
                                    border: '1px solid #4CAF50',
                                    backgroundColor: 'white',
                                    color: '#4CAF50',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                            {t('prof.edit_btn')} {/* Added Translation key */}
                        </button>
                        <button
                                onClick={() => {
                                    handleDeleteAccount();
                                }}
                                style={{
                                    width: '200px',
                                    padding: '8px 20px',
                                    marginLeft: '5px',
                                    fontSize: '14px',
                                    borderRadius: '5px',
                                    border: '1px solid #D93814',
                                    backgroundColor: 'white',
                                    color: '#D93814',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {sentence(t('prof.delete_btn'))} {/* Added Translation key */}
                        </button>
                    </>
                ) : (
                    // MODO EDICIÓN
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>{t('prof.field_id')}:</strong> {userProfile.id} <em>({t('prof.field_id_readonly')})</em> {/* Added Translation key */}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>
                                <strong>{t('user')}:</strong>
                                <input
                                    type="text"
                                    value={editForm.nick}
                                    onChange={(e) => setEditForm({ ...editForm, nick: e.target.value })}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>
                                <strong>Email:</strong>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>
                                <strong>{t('cumple')}:</strong> {/* Added Translation key */}
                                <input
                                    type="date"
                                    value={editForm.birth}
                                    onChange={(e) => setEditForm({ ...editForm, birth: e.target.value })}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                            </label>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>
                                <strong>{t('prof.field_country')}:</strong> {/* Added Translation key */}
                                <select
                                    value={editForm.country}
                                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                    style={{ width: '100%', marginTop: '5px' }}
                                    disabled={isLoadingCountries}>
                                    <option value="">
                                        {isLoadingCountries ? t('prof.loading_countries') : t('prof.sel_country')} {/* Added Translation key */}
                                    </option>
                                    {countries.map((c) => (
                                        <option key={c.coun2_pk} value={c.coun2_pk}>
                                            {c.coun_name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>
                                <strong>{t('lang')}:</strong> {/* Added Translation key */}
                                <select
                                    value={editForm.lang}
                                    onChange={(e) => setEditForm({ ...editForm, lang: e.target.value })}    
                                    style={{ width: '100%', marginTop: '5px' }}>
                                    <option value="">{t('prof.sel_lang')}</option> {/* Added Translation key */}
                                    <option value="es">Español</option>
                                    <option value="ca">Català</option>
                                    <option value="en">English</option>
                                    <option value="fr">Français</option>
                                </select>
                            </label>
                        </div>

                        {/* Cambio de contraseña - Solo para usuarios NO OAuth */}
                        {!isOAuthUser && (
                            <>
                                <hr style={{ margin: '20px 0' }} />
                                <h3>{t('prof.change_pass')}</h3> {/* Added Translation key */}

                                <div style={{ marginBottom: '15px' }}>
                                    <label>
                                        <strong>{t('prof.current_pass')}:</strong> {/* Added Translation key */}
                                        <input
                                            type="password"
                                            value={editForm.currentPassword}
                                            onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                                            style={{ width: '100%', marginTop: '5px' }}
                                            placeholder={t('prof.current_pass_ph')} // Added Translation key
                                        />
                                    </label>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label>
                                        <strong>{t('prof.new_pass')}:</strong> {/* Added Translation key */}
                                        <input
                                            type="password"
                                            value={editForm.newPassword}
                                            onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                                            style={{ width: '100%', marginTop: '5px' }}
                                            placeholder={t('prof.new_pass_ph')} // Added Translation key
                                        />
                                    </label>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label>
                                        <strong>{t('prof.confirm_pass')}:</strong> {/* Added Translation key */}
                                        <input
                                            type="password"
                                            value={editForm.confirmPassword}
                                            onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                                            style={{ width: '100%', marginTop: '5px' }}
                                            placeholder={t('prof.confirm_pass_ph')} // Added Translation key
                                        />
                                    </label>
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button onClick={handleUpdateProfile}>
                                {t('prof.save_btn')} {/* Added Translation key */}
                            </button>
                            <button onClick={handleCancelEdit}>
                                {t('prof.cancel')} {/* Added Translation key */}
                            </button>
                        </div>
                    </>
                )}
            </>
        );
    };

    const renderFriendScreen = () => {
        // Buscamos el usuario seleccionado en el desplegable para mostrar su avatar
        const selectedCandidate = candidates.find(c => String(c.id) === String(targetIdInput));

        return (
            <>
                <h1>{firstcap(t('prof.friends_title'))}</h1>

                <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                        {t('prof.invite_label')}
                    </label>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {/* Selector */}
                        <select
                            value={targetIdInput}
                            onChange={(e) => setTargetIdInput(e.target.value)}
                            disabled={isLoadingCandidates}
                            style={{ flex: 1, padding: '8px' }}>
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
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #ddd' }}>
                                <img 
                                    src={getDisplayAvatar(selectedCandidate.id, (selectedCandidate as any).avatar)} 
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleSendRequest}
                            disabled={!targetIdInput || isLoadingCandidates}
                            style={{ padding: '8px 16px' }}>
                            {t('prof.send_request_btn')}
                        </button>
                    </div>
                </div>

                {statusMsg && <p style={{ marginBottom: '15px', color: '#22c55e' }}>{statusMsg}</p>}

                <h3>{sentence(t('prof.friends_title'))}</h3>
                
                {friends.length === 0 ? (
                    <p>{t('prof.no_friends')}</p>
                ) : (
                    <ul className="list-friend" style={{ listStyle: 'none', padding: 0 }}>
                        {friends.map((f, i) => (
                            <li key={i} className="amigo" style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '10px', 
                                borderBottom: '1px solid #eee' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* 1. Semáforo */}
                                    <div className="semaforo"
                                        style={{
                                            width: '10px', height: '10px', borderRadius: '50%',
                                            backgroundColor: f.status === 'online' ? '#22c55e' : '#6b7280',
                                            boxShadow: f.status === 'online' ? '0 0 8px #22c55e' : 'none'
                                        }}>
                                    </div>

                                    {/* 2. Avatar (NUEVO) */}
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                                        <img 
                                            // Asumimos que f tiene la propiedad 'avatar' gracias a nuestro arreglo en el backend
                                            src={getDisplayAvatar(f.id, (f as any).avatar)} 
                                            alt={f.friend_nick}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>

                                    {/* 3. Nombre */}
                                    <span style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                                        {f.friend_nick}
                                    </span>
                                </div>

                                <button 
                                    onClick={() => handleRemoveFriend(f.id, f.friend_nick)}
                                    style={{ 
                                        backgroundColor: '#ef4444', 
                                        color: 'white', 
                                        border: 'none', 
                                        padding: '5px 10px', 
                                        borderRadius: '4px',
                                        cursor: 'pointer' 
                                    }}
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
            <h1>{t('prof.requests_title')}</h1> {/* Added Translation key */}

            <h3>{t('prof.requests_h3')}</h3> {/* Added Translation key */}

            {requests.length === 0 && <p>{t('prof.no_requests')}</p>} {/* Added Translation key */}

            {requests.length > 0 && (
                <ul>
                    {requests.map((r) => (
                        <li key={r.id}>
                            <span>
                                <strong>{r.nick}</strong> {t('prof.wants_friend')} {/* Added Translation key */}
                            </span>
                            <div>
                                <button onClick={() => handleAccept(r.id)}>
                                    {t('prof.accept_btn')} {/* Added Translation key */}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    // const renderStatScreen = () => (
    //     <>
    //         <h1>{t('prof.stats_title')}</h1>
            
    //         {/* Aquí incrustamos el Leaderboard */}
    //         <div className="flex flex-col items-center mt-6">
    //             <Leaderboard />
    //         </div>
    //     </>
    // );
    const renderStatScreen = () => {
        const btnBaseStyle = "px-4 py-2 rounded-md font-bold transition-colors duration-200 shadow-md";
        const btnActiveStyle = "bg-cyan-600 text-white border border-cyan-400";
        const btnInactiveStyle = "bg-gray-800 text-gray-400 border border-gray-600 hover:bg-gray-700 hover:text-white";

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', width: '100%' }}>
                {/* Título de la sección */}
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '20px' }}>
                    {t('prof.stats_title')}
                </h1>
                
                {/* 🎛️ SUB-MENÚ DE BOTONES */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button 
                        onClick={() => setStatView('leaderboard')}
                        className={`${btnBaseStyle} ${statView === 'leaderboard' ? btnActiveStyle : btnInactiveStyle}`}
                        style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        🏆 Top 10 Global
                    </button>
                    <button 
                        onClick={() => setStatView('history')}
                        className={`${btnBaseStyle} ${statView === 'history' ? btnActiveStyle : btnInactiveStyle}`}
                        style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        📜 Mi Historial
                    </button>
                    <button 
                        onClick={() => setStatView('grafana')}
                        className={`${btnBaseStyle} ${statView === 'grafana' ? btnActiveStyle : btnInactiveStyle}`}
                        style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        📊 Analítica Avanzada
                    </button>
                </div>

                {/* 📺 CONTENIDO DINÁMICO QUE CAMBIA SEGÚN EL BOTÓN */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    {statView === 'leaderboard' && (
                        <Leaderboard />
                    )}
                    
                    {statView === 'history' && (
                        <MatchHistory myProfile={userProfile} />
                    )}
                    
                    {statView === 'grafana' && (
                        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px', backgroundColor: '#111827', borderRadius: '12px', width: '100%', maxWidth: '800px' }}>
                            <h2 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '10px' }}>Dashboard de Grafana</h2>
                            <p>Aquí incrustaremos el iFrame con las métricas del servidor en tiempo real...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <main className="profile">
            <nav>
                <ul>
                    <li
                        onClick={() => setActiveTab("info")}
                        className={activeTab === "info" ? "selected" : ""}>
                        {t('prof.tab_info')} {/* Added Translation key */}
                    </li>
                    <li
                        onClick={() => setActiveTab("friends")}
                        className={activeTab === "friends" ? "selected" : ""}>
                        {t('prof.tab_friends', { count: friends.length })} {/* Added Translation key */}
                    </li>
                    <li
                        onClick={() => setActiveTab("requests")}
                        className={activeTab === "requests" ? "selected" : ""}>
                        {t('prof.tab_requests')} {/* Added Translation key */}
                        {requests.length > 0 &&
                            <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                ({requests.length})
                            </span>}
                    </li>
                    <li
                        onClick={() => setActiveTab("stats")}
                        className={activeTab === "stats" ? "selected" : ""}>
                        {t('prof.tab_stats')} {/* Added Translation key */}
                    </li>
                </ul>
            </nav>

            <section>
                <div className="p-cont">
                    {activeTab === 'info' && renderInfoScreen()}
                    {activeTab === 'friends' && renderFriendScreen()}
                    {activeTab === 'requests' && renderRequestScreen()}
                    {activeTab === 'stats' && renderStatScreen()}
                </div>
            </section>
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