// const ProfileScreen = () =>
// {
//     return (
//         <section>
//             <h1>Este es el profile</h1>
//         </section>
//     );
// };

// export default ProfileScreen;

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
    type UserCandidate
} from '../services/friend.service';

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

    // --- CARGA DE DATOS ---

        // const loadSocialData = async () => {
    //     const f = await getMyFriends();
    //     setFriends(f);
    //     const r = await getPendingRequests();
    //     setRequests(r);
    // };
    const loadSocialData = async () => {
        try {
            //Cargamos amigos
            const f = await getMyFriends();
            // CHIVATO: Veremos en la consola qué llega exactamente
            console.log("📦 [DEBUG] Amigos cargados:", f); 
            setFriends(f);
            
            const r = await getPendingRequests();
            setRequests(r);

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

    // Cargar datos al montar
    useEffect(() => {
        // 1. Carga inicial
        loadSocialData();

        // --- 2. LISTENERS DE SOCKET (TIEMPO REAL) ---
        
        // A: Alguien me envía solicitud (User 2 invita a User 1)
        const handleNewRequest = (data: any) => {
            console.log("🔔 [SOCKET] Nueva solicitud recibida:", data);
            loadSocialData(); // Recargamos para que aparezca el badge rojo
        };

        // B: Alguien acepta mi solicitud (User 2 acepta a User 1) -> ESTE ES EL QUE TE FALTABA
        const handleFriendAccepted = (data: any) => {
            console.log("🎉 [SOCKET] Solicitud aceptada por amigo:", data);
            loadSocialData(); // Recargamos para que aparezca en la lista de amigos
            setStatusMsg("¡Nuevo amigo añadido!");
        };

        // NUEVO: LISTENER DE CAMBIO DE ESTADO
        const handleStatusChange = (data: { userId: number, status: 'online' | 'offline' }) => {
            console.log(`🚥 Estado usuario ${data.userId} cambió a: ${data.status}`);
            
            // Actualizamos la lista de amigos localmente sin recargar todo del servidor
            setFriends((prevFriends: Friend[]) => prevFriends.map((f: Friend) => {
                if (f.id === data.userId) {
                    return { ...f, status: data.status };
                }
                return f;
            }));
        };

        // Activar escuchas
        socket.on('friend_request', handleNewRequest);
        socket.on('friend_accepted', handleFriendAccepted);
        socket.on('user_status_change', handleStatusChange);

        // Limpiar escuchas al salir de la pantalla
        return () => {
            socket.off('friend_request', handleNewRequest);
            socket.off('friend_accepted', handleFriendAccepted);
            socket.off('user_status_change', handleStatusChange);
        };
    }, []);



    // const handleSendRequest = async () => {
    //     if (!targetIdInput) return;
    //     const res = await sendFriendRequest(parseInt(targetIdInput));
    //     setStatusMsg(res.msg || (res.ok ? "Solicitud enviada" : "Error"));
    //     setTargetIdInput("");
    // };

    const handleSendRequest = async () => {
        if (!targetIdInput) return; // Validación básica
        
        setIsLoadingCandidates(true); // Bloqueamos visualmente mientras envía
        const res = await sendFriendRequest(parseInt(targetIdInput));
        setStatusMsg(res.msg || (res.ok ? "Solicitud enviada" : "Error"));
        
        setTargetIdInput(""); // Reseteamos el select
        loadSocialData(); // Recargamos para que el usuario desaparezca de la lista
    };

    const handleAccept = async (id: number) => {
        await acceptFriendRequest(id);
        loadSocialData(); // Recargar listas
    };

    // return (
    //     <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-8">
    //         <h1 className="text-4xl font-bold mb-6">Mi Perfil</h1>

    //         {/* TABS */}
    //         <div className="flex space-x-4 mb-8">
    //             <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded ${activeTab === 'info' ? 'bg-blue-600' : 'bg-gray-700'}`}>Mis Datos</button>
    //             <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 rounded ${activeTab === 'friends' ? 'bg-blue-600' : 'bg-gray-700'}`}>Amigos ({friends.length})</button>
    //             <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded ${activeTab === 'requests' ? 'bg-blue-600' : 'bg-gray-700'} relative`}>
    //                 Solicitudes {requests.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">{requests.length}</span>}
    //             </button>
    //         </div>

    //         <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg">
                
    //             {/* INFO */}
    //             {activeTab === 'info' && (
    //                 <div className="text-center">
    //                     <div className="w-24 h-24 bg-gray-600 rounded-full mx-auto mb-4"></div>
    //                     <h2 className="text-2xl font-bold">{localStorage.getItem("pong_user_nick")}</h2>
    //                     <p className="text-gray-400">ID: {localStorage.getItem("pong_user_id")}</p>
    //                 </div>
    //             )}

    //             {/* AMIGOS */}
    //             {activeTab === 'friends' && (
    //                 <div>
    //                     <div className="flex gap-2 mb-6 p-4 bg-gray-700 rounded">
    //                         <input type="number" placeholder="ID de usuario a añadir" value={targetIdInput} onChange={e => setTargetIdInput(e.target.value)} className="flex-1 p-2 rounded text-black"/>
    //                         <button onClick={handleSendRequest} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Añadir</button>
    //                     </div>
    //                     {statusMsg && <p className="mb-4 text-yellow-400 text-sm">{statusMsg}</p>}

    //                     <h3 className="text-xl font-bold mb-4">Lista de Amigos</h3>
    //                     {friends.length === 0 ? (
    //                         <p className="text-gray-500 italic">No tienes amigos.</p>
    //                     ) : (
    //                         <ul className="space-y-2">
    //                             {friends.map((f, i) => (
    //                     // <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
    //                     //     <div className="flex items-center gap-3">
                                
    //                     //         {/* 🔥 CORRECCIÓN VISUAL DEFINITIVA */}
    //                     //         {/* Usamos style={{...}} para forzar el tamaño si Tailwind falla */}
    //                     //         <div 
    //                     //             style={{ width: '12px', height: '12px', minWidth: '12px', minHeight: '12px', borderRadius: '50%' }}
    //                     //             className={`${
    //                     //                 f.status === 'online' 
    //                     //                 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' 
    //                     //                 : 'bg-gray-400 border border-gray-500' // Gris más claro y borde para que destaque
    //                     //             }`} 
    //                     //             title={f.status || 'offline'}
    //                     //         ></div>
                                
    //                     //         <span className="font-bold">{f.friend_nick}</span>
                                
    //                     //         {/* Debug (Puedes quitarlo si ya ves el punto) */}
    //                     //         <span className="text-[10px] text-gray-400 ml-2">
    //                     //             ({f.status})
    //                     //         </span>

    //                     //     </div>
    //                     //     <button className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
    //                     // </li>
    //                     <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
    //                         <div className="flex items-center gap-3">
                                
    //                             {/* 🔥 SEMÁFORO CON ESTILOS FORZADOS (Sin Tailwind para asegurar) */}
    //                             <div 
    //                                 style={{
    //                                     width: '12px',
    //                                     height: '12px',
    //                                     minWidth: '12px',        // Evita que se aplaste
    //                                     borderRadius: '50%',     // Lo hace redondo
    //                                     // Color directo: Verde hex o Gris hex
    //                                     backgroundColor: f.status === 'online' ? '#22c55e' : '#6b7280',
    //                                     // Sombra para efecto de luz si está online
    //                                     boxShadow: f.status === 'online' ? '0 0 8px #22c55e' : 'none',
    //                                     marginRight: '8px'
    //                                 }}
    //                             ></div>
                                
    //                             <span className="font-bold">{f.friend_nick}</span>
                                
    //                             {/* Texto de debug (opcional, ya sabemos que funciona) */}
    //                             <span className="text-xs text-gray-400">({f.status})</span>

    //                         </div>
    //                         <button className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
    //                     </li>
    //                             ))}
    //                         </ul>
    //                     )}
    //                 </div>
    //             )}

    //             {/* SOLICITUDES */}
    //             {activeTab === 'requests' && (
    //                 <div>
    //                     <h3 className="text-xl font-bold mb-4">Solicitudes</h3>
    //                     {requests.map((r) => (
    //                         <li key={r.id} className="flex justify-between items-center bg-gray-700 p-3 rounded border-l-4 border-yellow-500 mb-2">
    //                             <span><strong className="text-yellow-400">{r.nick}</strong> te invita</span>
    //                             <div className="flex gap-2">
    //                                 <button onClick={() => handleAccept(r.id)} className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500">Aceptar</button>
    //                             </div>
    //                         </li>
    //                     ))}
    //                 </div>
    //             )}
    //         </div>
    //     </div>
    // );
    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-4xl font-bold mb-6">Mi Perfil</h1>

            {/* TABS DE NAVEGACIÓN */}
            <div className="flex space-x-4 mb-8">
                <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded ${activeTab === 'info' ? 'bg-blue-600' : 'bg-gray-700'}`}>Mis Datos</button>
                <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 rounded ${activeTab === 'friends' ? 'bg-blue-600' : 'bg-gray-700'}`}>Amigos ({friends.length})</button>
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded ${activeTab === 'requests' ? 'bg-blue-600' : 'bg-gray-700'} relative`}>
                    Solicitudes {requests.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">{requests.length}</span>}
                </button>
            </div>

            <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg">
                
                {/* PESTAÑA INFO */}
                {activeTab === 'info' && (
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gray-600 rounded-full mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold">{localStorage.getItem("pong_user_nick")}</h2>
                        <p className="text-gray-400">ID: {localStorage.getItem("pong_user_id")}</p>
                    </div>
                )}

                {/* PESTAÑA AMIGOS */}
                {activeTab === 'friends' && (
                    <div>
                        {/* --- SELECT DE INVITACIÓN (Estilo SignScreen) --- */}
                        <div className="flex gap-2 mb-6 p-4 bg-gray-700 rounded items-center">
                            <label className="text-sm text-gray-300 mr-2">Invitar:</label>
                            
                            <select 
                                value={targetIdInput}
                                onChange={(e) => setTargetIdInput(e.target.value)}
                                className="flex-1 p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
                                disabled={isLoadingCandidates} // Deshabilitado mientras carga
                            >
                                {/* Opción por defecto cambiante según estado */}
                                <option value="">
                                    {isLoadingCandidates ? 'Cargando usuarios...' : '-- Selecciona Jugador --'}
                                </option>
                                
                                {/* Mapeo de usuarios disponibles */}
                                {candidates.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.nick}
                                    </option>
                                ))}
                            </select>

                            <button 
                                onClick={handleSendRequest} 
                                disabled={!targetIdInput || isLoadingCandidates}
                                className={`px-4 py-2 rounded transition ${
                                    !targetIdInput || isLoadingCandidates 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                Enviar
                            </button>
                        </div>
                        
                        {statusMsg && <p className="mb-4 text-yellow-400 text-sm text-center">{statusMsg}</p>}

                        {/* LISTA DE AMIGOS */}
                        <h3 className="text-xl font-bold mb-4">Lista de Amigos</h3>
                        {friends.length === 0 ? (
                            <p className="text-gray-500 italic">No tienes amigos aún.</p>
                        ) : (
                            <ul className="space-y-2">
                                {friends.map((f, i) => (
                                    <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                        <div className="flex items-center gap-3">
                                            {/* Semáforo (Verde/Gris) */}
                                            <div style={{
                                                width: '12px', height: '12px', minWidth: '12px', borderRadius: '50%',
                                                backgroundColor: f.status === 'online' ? '#22c55e' : '#6b7280',
                                                boxShadow: f.status === 'online' ? '0 0 8px #22c55e' : 'none',
                                            }}></div>
                                            <span className="font-bold">{f.friend_nick}</span>
                                        </div>
                                        <button className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* PESTAÑA SOLICITUDES */}
                {activeTab === 'requests' && (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Solicitudes Pendientes</h3>
                        {requests.length === 0 && <p className="text-gray-500 italic">No hay solicitudes.</p>}
                        {requests.map((r) => (
                            <li key={r.id} className="flex justify-between items-center bg-gray-700 p-3 rounded border-l-4 border-yellow-500 mb-2">
                                <span><strong className="text-yellow-400">{r.nick}</strong> quiere ser tu amigo</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleAccept(r.id)} className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500">Aceptar</button>
                                </div>
                            </li>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

};

export default ProfileScreen;