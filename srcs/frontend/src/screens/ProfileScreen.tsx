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
import { useModal } from '../context/ModalContext';

import "../css/ProfileScreen.css";

const ProfileScreen = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'info' | 'friends' | 'requests'>('info');
    
    // Estados de datos
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<PendingRequest[]>([]);

    // --- LÓGICA COPIADA DE SIGNSCREEN (Adaptada) ---
    const [candidates, setCandidates] = useState<UserCandidate[]>([]); // Como 'countries'
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(true); // Como 'isLoadingCountries'
    
    
    // Estado para añadir amigo (temporalmente por ID hasta que tengamos buscador por nombre)
    const [targetIdInput, setTargetIdInput] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    const { showModal } = useModal();

    // --- CARGA DE DATOS ---

    const loadSocialData = async () => {
        try {
            //Cargamos amigos
            const f = await getMyFriends();
            // CHIVATO: Veremos en la consola qué llega exactamente
            console.log("📦 [DEBUG] Amigos cargados:", f); 
            setFriends(f);
            
            const r = await getPendingRequests();
            setRequests(r);
            console.log("📨 [DEBUG] Solicitudes cargadas del servidor:", r);

            // Cargar candidatos (Lógica similar al useEffect de SignScreen)
            setIsLoadingCandidates(true); // Activamos carga
            const c = await getUsersToInvite();
            setCandidates(c);

        } catch (e) {
            console.error("Error cargando datos", e);
        } finally {
            setIsLoadingCandidates(false); // Desactivamos carga al terminar
        }
    };

    // const handleRemoveFriend = async (friendId: number, friendName: string) => {
    //     // 1. Confirmación de seguridad
    //     if (!window.confirm(`¿Seguro que quieres eliminar a ${friendName}?`)) {
    //         return;
    //     }
        

    //     // 2. OPTIMISTIC UI: Lo quitamos de la lista visualmente YA
    //     setFriends((prev: Friend[]) => prev.filter((f) => Number(f.id) !== Number(friendId)));

    //     try {
    //         // 3. Llamada al backend
    //         const res = await removeFriend(friendId);
    //         if (res.ok) {
    //             setStatusMsg(`Has eliminado a ${friendName}`);
    //         } else {
    //             // Si falla, recargamos para que vuelva a aparecer
    //             loadSocialData(); 
    //         }
    //     } catch (error) {
    //         console.error("Error eliminando amigo:", error);
    //     }
        
    //     // 4. Recarga de seguridad a los 300ms (para actualizar candidatos)
    //     setTimeout(() => loadSocialData(), 300);
    // };

    const handleRemoveFriend = (friendId: number, friendName: string) => {
        
        // 1. Lanzamos el Modal en lugar del window.confirm
        showModal({
            title: "🗑️ Eliminar Amigo",
            message: `¿Seguro que quieres eliminar a ${friendName}?`,
            type: "confirm", // Esto muestra botones Aceptar/Cancelar
            onConfirm: async () => {
                
                // --- AQUÍ EMPIEZA LA LÓGICA QUE TENÍAS ANTES ---

                // 2. OPTIMISTIC UI: Lo quitamos de la lista visualmente YA
                setFriends((prev: Friend[]) => prev.filter((f) => Number(f.id) !== Number(friendId)));

                try {
                    // 3. Llamada al backend
                    const res = await removeFriend(friendId);
                    
                    if (res.ok) {
                        setStatusMsg(`Has eliminado a ${friendName}`);
                    } else {
                        // Si falla, recargamos para que vuelva a aparecer (Rollback)
                        loadSocialData(); 
                    }
                } catch (error) {
                    console.error("Error eliminando amigo:", error);
                    // Opcional: Podrías mostrar otro showModal de error aquí si quisieras
                }
                
                // 4. Recarga de seguridad a los 300ms
                setTimeout(() => loadSocialData(), 300);
            }
        });
    };

    // Cargar datos al montar

    useEffect(() => {
        // Carga inicial
        loadSocialData();

        // --- HANDLERS ---

        const handleNewRequest = () => {
            console.log("🔔 [SOCKET] Nueva solicitud recibida");
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
            setFriends((prev: Friend[]) => prev.map((f) => {
            // Usamos Number() para asegurar que comparamos números con números
            if (Number(f.id) === Number(data.userId)) {
                return { ...f, status: data.status };
            }
            return f;
            }));
        };

        // 🔥 ESTE ES EL IMPORTANTE CON LOGS DE DEPURACIÓN
        const handleFriendRemoved = (data: any) => {
            console.log("🚨 [SOCKET RECIBIDO] Evento 'friend_removed' llegó con datos:", data);

            if (!data || !data.from) {
                console.error("❌ El evento llegó sin ID 'from'");
                return;
            }

            const idQueMeBorro = Number(data.from);
            console.log(`🔪 Intentando borrar al usuario ID ${idQueMeBorro} de mi lista local...`);

            setFriends((prev: Friend[]) => {
                const cantidadAntes = prev.length;
                // Filtramos: Dejamos pasar a todos MENOS al que tenga ese ID
                const nuevaLista = prev.filter(f => Number(f.id) !== idQueMeBorro);
                
                console.log(`📉 Cambio visual: ${cantidadAntes} amigos -> ${nuevaLista.length} amigos`);
                return nuevaLista;
            });
            
            // Recarga de seguridad (backup)
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
            console.log("🔕 Desuscribiéndose eventos...");
            socket.off('friend_request', handleNewRequest);
            socket.off('friend_accepted', handleFriendAccepted);
            socket.off('user_status', handleStatusChange);
            socket.off('friend_removed', handleFriendRemoved);
        };
    }, []);

    const handleSendRequest = async () => {
        if (!targetIdInput) return; // Validación básica
        
        setIsLoadingCandidates(true); // Bloqueamos visualmente mientras envía
        const res = await sendFriendRequest(parseInt(targetIdInput));
        setStatusMsg(res.msg || (res.ok ? "Solicitud enviada" : "Error"));
        
        setTargetIdInput(""); // Reseteamos el select
        loadSocialData(); // Recargamos para que el usuario desaparezca de la lista
    };

    const handleAccept = async (id: number) => {
        // 1. OPTIMISTIC UI: Lo borramos visualmente INMEDIATAMENTE
        // Esto hace que la interfaz se sienta ultra rápida
        setRequests((prev: PendingRequest[]) => prev.filter((r) => r.id !== id));

        // 2. Llamamos al backend
        await acceptFriendRequest(id);

        // 3. Recargamos datos reales por si acaso (para actualizar la lista de amigos)
        // Esperamos un poco para asegurar que la DB terminó
        setTimeout(() => {
            loadSocialData();
        }, 300);
    };

    const InfoScreen = () =>
    (
        <>
            <h1>Perfil de usuario</h1>

            <h3>{localStorage.getItem("pong_user_nick")}</h3>
            <p>ID: {localStorage.getItem("pong_user_id")}</p>
        </>
    );

    const FriendScreen = () =>
    (
        <>
            <h1>Lista de amigos</h1>

            {/* --- SELECT DE INVITACIÓN --- */}
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

            {/* Mensaje de estado */}
            {statusMsg && <p>{statusMsg}</p>}

            {/* Lista de amigos */}
            <h3>Lista de Amigos</h3>
            {friends.length === 0 ? (
            <p>No tienes amigos aún.</p>
            ) : (
            <ul className="list-friend">
                {friends.map((f, i) => (
                <li key={i} className="amigo">
                    <div>
                        {/* Semáforo verde/gris */}
                        <div className="semaforo"
                            style={{backgroundColor: f.status === 'online' ? '#22c55e' : '#6b7280', boxShadow: f.status === 'online' ? '0 0 8px #22c55e' : 'none'}}>
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

    const RequestScreen = () =>
    (
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

    const StatScreen = () =>
    (
        <>
            <h1>Estadisticas</h1>
            <p>Esta es la pagina de stats</p>
        </>
    );

    return (
        <main className="profile">
            {/* Navegacion */}
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

            {/* Contenido */}
            <section>
                <div className="p-cont">
                    {activeTab === 'info' && <InfoScreen />}
                    {activeTab === 'friends' && <FriendScreen />}
                    {activeTab === 'requests' && <RequestScreen />}
                    {activeTab === 'stats' && <StatScreen />}
                </div>
            </section>
            {/* <section></section> */}
        </main>
    );
};

export default ProfileScreen;