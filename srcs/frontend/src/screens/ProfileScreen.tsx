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
    type UserProfile,
    type Country,
    type UpdateProfileData
} from '../services/user.service';
import { useModal } from '../context/ModalContext';
import { Avatar } from '../components/Avatar';
import "../css/ProfileScreen.css";

// To update header if user changes the nick
interface ProfileScreenProps {
    setGlobalUser: (nick: string) => void;
}

const ProfileScreen = ({ setGlobalUser }: ProfileScreenProps) => {
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
                        setStatusMsg(`Has eliminado a ${friendName}`);
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
                title: "Error",
                message: "El nombre de usuario y el email son obligatorios",
                type: "alert"
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
                    title: "Error",
                    message: "Debes introducir tu contraseña actual para cambiarla",
                    type: "alert"
                });
                return;
            }
            if (editForm.newPassword !== editForm.confirmPassword) {
                console.warn("⚠️ [ProfileScreen] Validation failed: Passwords don't match");
                showModal({
                    title: "Error",
                    message: "Las contraseñas nuevas no coinciden",
                    type: "alert"
                });
                return;
            }
            if (editForm.newPassword.length < 6) {
                console.warn("⚠️ [ProfileScreen] Validation failed: Password too short");
                showModal({
                    title: "Error",
                    message: "La nueva contraseña debe tener al menos 6 caracteres",
                    type: "alert"
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
                lang: editForm.lang
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
                throw new Error(result.msg || 'Error actualizando perfil');
            }

            console.log("✅ [ProfileScreen] Profile updated successfully");

            // Actualizar localStorage si cambió el nick
            if (editForm.nick !== userProfile?.nick) {
                console.log("🔄 [ProfileScreen] Updating localStorage with new nick:", editForm.nick);
                localStorage.setItem('pong_user_nick', editForm.nick);
            }

            showModal({
                title: "✅ Perfil Actualizado",
                message: "Tu perfil se ha actualizado correctamente",
                type: "alert"
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
                title: "Error",
                message: error.message || "No se pudo actualizar tu perfil",
                type: "alert"
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
                setStatusMsg("¡Nuevo amigo añadido!");
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

        // --- SUSCRIPCIONES ---
        console.log("🎧 Suscribiéndose a eventos del socket...");
        socket.on('friend_request', handleNewRequest);
        socket.on('friend_accepted', handleFriendAccepted);
        socket.on('user_status', handleStatusChange);
        socket.on('friend_removed', handleFriendRemoved);

        // --- CLEANUP ---
        return () => {
            console.log("🔕 Desuscribiéndose eventos del socket...");
            socket.off('friend_request', handleNewRequest);
            socket.off('friend_accepted', handleFriendAccepted);
            socket.off('user_status', handleStatusChange);
            socket.off('friend_removed', handleFriendRemoved);
        };
    }, []);

    const handleSendRequest = async () => {
        if (!targetIdInput) return;
        
        console.log("📤 [ProfileScreen] Sending friend request to:", targetIdInput);
        
        setIsLoadingCandidates(true);
        const res = await sendFriendRequest(parseInt(targetIdInput));
        setStatusMsg(res.msg || (res.ok ? "Solicitud enviada" : "Error"));
        
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

    // --- COMPONENTES DE PANTALLA ---

    const renderInfoScreen = () => {
        if (isLoadingProfile) {
            console.log("⏳ [InfoScreen] Loading profile...");
            return <p>Cargando perfil...</p>;
        }

        if (!userProfile) {
            console.error("❌ [InfoScreen] No profile data available");
            return <p>No se pudo cargar el perfil</p>;
        }

        const isOAuthUser = !!userProfile.oauthProvider;
        console.log("👤 [InfoScreen] Rendering profile. OAuth user:", isOAuthUser);

        return (
            <>
                <h1>Perfil de usuario</h1>

                {/* Avatar */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <Avatar 
                        src={userProfile.avatarUrl}
                        userId={userProfile.id}
                        size={150}
                        alt={userProfile.nick}
                    />
                </div>

                {!isEditing ? (
                    // MODO VISUALIZACIÓN
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>ID:</strong> {userProfile.id}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>{t('user')}:</strong> {userProfile.nick}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>Email:</strong> {userProfile.email}
                        </div>
                        {userProfile.birth && (
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Fecha de Nacimiento:</strong> {userProfile.birth}
                            </div>
                        )}
                        <div style={{ marginBottom: '10px' }}>
                            <strong>País:</strong> {userProfile.country}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>Idioma:</strong> {userProfile.lang}
                        </div>
                        {isOAuthUser && (
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Proveedor OAuth:</strong> {userProfile.oauthProvider}
                            </div>
                        )}

                        <button 
                            onClick={() => {
                                console.log("✏️ [InfoScreen] Entering edit mode");
                                setIsEditing(true);
                            }}
                            style={{ marginTop: '20px' }}>
                            ✏️ Editar Perfil
                        </button>
                    </>
                ) : (
                    // MODO EDICIÓN
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>ID:</strong> {userProfile.id} <em>(no editable)</em>
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
                                <strong>Fecha de Nacimiento:</strong>
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
                                <strong>País:</strong>
                                <select
                                    value={editForm.country}
                                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                    style={{ width: '100%', marginTop: '5px' }}
                                    disabled={isLoadingCountries}>
                                    <option value="">
                                        {isLoadingCountries ? "Cargando países..." : "-- Selecciona un país --"}
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
                                <strong>Idioma:</strong>
                                <select
                                    value={editForm.lang}
                                    onChange={(e) => setEditForm({ ...editForm, lang: e.target.value })}
                                    style={{ width: '100%', marginTop: '5px' }}>
                                    <option value="">-- Selecciona idioma --</option>
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
                                <h3>Cambiar Contraseña (opcional)</h3>

                                <div style={{ marginBottom: '15px' }}>
                                    <label>
                                        <strong>Contraseña Actual:</strong>
                                        <input
                                            type="password"
                                            value={editForm.currentPassword}
                                            onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                                            style={{ width: '100%', marginTop: '5px' }}
                                            placeholder="Solo si quieres cambiar la contraseña"
                                        />
                                    </label>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label>
                                        <strong>Nueva Contraseña:</strong>
                                        <input
                                            type="password"
                                            value={editForm.newPassword}
                                            onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                                            style={{ width: '100%', marginTop: '5px' }}
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </label>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label>
                                        <strong>Confirmar Nueva Contraseña:</strong>
                                        <input
                                            type="password"
                                            value={editForm.confirmPassword}
                                            onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                                            style={{ width: '100%', marginTop: '5px' }}
                                            placeholder="Repite la nueva contraseña"
                                        />
                                    </label>
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button onClick={handleUpdateProfile}>
                                💾 Guardar Cambios
                            </button>
                            <button onClick={handleCancelEdit}>
                                ❌ Cancelar
                            </button>
                        </div>
                    </>
                )}
            </>
        );
    };

    const renderFriendScreen = () => (
        <>
            <h1>Lista de amigos</h1>

            <div>
                <label>Invitar:</label>
                <select
                    value={targetIdInput}
                    onChange={(e) => setTargetIdInput(e.target.value)}
                    disabled={isLoadingCandidates}>
                    <option value="">
                        {isLoadingCandidates ? "Cargando usuarios..." : "-- Selecciona Jugador --"}
                    </option>
                    {candidates.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.nick}
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleSendRequest}
                    disabled={!targetIdInput || isLoadingCandidates}>
                    Enviar
                </button>
            </div>

            {statusMsg && <p>{statusMsg}</p>}

            <h3>Lista de Amigos</h3>
            {friends.length === 0 ? (
                <p>No tienes amigos aún.</p>
            ) : (
                <ul className="list-friend">
                    {friends.map((f, i) => (
                        <li key={i} className="amigo">
                            <div>
                                <div className="semaforo"
                                    style={{
                                        backgroundColor: f.status === 'online' ? '#22c55e' : '#6b7280',
                                        boxShadow: f.status === 'online' ? '0 0 8px #22c55e' : 'none'
                                    }}>
                                </div>
                                <span>{f.friend_nick}</span>
                            </div>
                            <button onClick={() => handleRemoveFriend(f.id, f.friend_nick)}>
                                Eliminar
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    const renderRequestScreen = () => (
        <>
            <h1>Solicitudes</h1>

            <h3>Solicitudes Pendientes</h3>

            {requests.length === 0 && <p>No hay solicitudes.</p>}

            {requests.length > 0 && (
                <ul>
                    {requests.map((r) => (
                        <li key={r.id}>
                            <span>
                                <strong>{r.nick}</strong> quiere ser tu amigo
                            </span>
                            <div>
                                <button onClick={() => handleAccept(r.id)}>
                                    Aceptar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    const renderStatScreen = () => (
        <>
            <h1>Estadísticas</h1>
            <p>Esta es la página de stats</p>
        </>
    );

    return (
        <main className="profile">
            <nav>
                <ul>
                    <li
                        onClick={() => setActiveTab("info")}
                        className={activeTab === "info" ? "selected" : ""}>
                        Datos
                    </li>
                    <li
                        onClick={() => setActiveTab("friends")}
                        className={activeTab === "friends" ? "selected" : ""}>
                        Amigos ({friends.length})
                    </li>
                    <li
                        onClick={() => setActiveTab("requests")}
                        className={activeTab === "requests" ? "selected" : ""}>
                        Solicitudes {requests.length > 0 && 
                            <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                ({requests.length})
                            </span>}
                    </li>
                    <li
                        onClick={() => setActiveTab("stats")}
                        className={activeTab === "stats" ? "selected" : ""}>
                        Stats
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
        </main>
    );
};

export default ProfileScreen;