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
    sendFriendRequest,
    type Friend, 
    type PendingRequest 
} from '../services/friend.service';

const ProfileScreen = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'info' | 'friends' | 'requests'>('info');
    
    // Estados de datos
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    
    // Estado para añadir amigo (temporalmente por ID hasta que tengamos buscador por nombre)
    const [targetIdInput, setTargetIdInput] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

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

        // Activar escuchas
        socket.on('friend_request', handleNewRequest);
        socket.on('friend_accepted', handleFriendAccepted);

        // Limpiar escuchas al salir de la pantalla
        return () => {
            socket.off('friend_request', handleNewRequest);
            socket.off('friend_accepted', handleFriendAccepted);
        };
    }, []);

    const loadSocialData = async () => {
        const f = await getMyFriends();
        setFriends(f);
        const r = await getPendingRequests();
        setRequests(r);
    };

    const handleSendRequest = async () => {
        if (!targetIdInput) return;
        const res = await sendFriendRequest(parseInt(targetIdInput));
        setStatusMsg(res.msg || (res.ok ? "Solicitud enviada" : "Error"));
        setTargetIdInput("");
    };

    const handleAccept = async (id: number) => {
        await acceptFriendRequest(id);
        loadSocialData(); // Recargar listas
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-4xl font-bold mb-6">Mi Perfil</h1>

            {/* --- TABS --- */}
            <div className="flex space-x-4 mb-8">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 rounded ${activeTab === 'info' ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                    Mis Datos
                </button>
                <button 
                    onClick={() => setActiveTab('friends')}
                    className={`px-4 py-2 rounded ${activeTab === 'friends' ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                    Amigos ({friends.length})
                </button>
                <button 
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 rounded ${activeTab === 'requests' ? 'bg-blue-600' : 'bg-gray-700'} relative`}
                >
                    Solicitudes
                    {requests.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {requests.length}
                        </span>
                    )}
                </button>
            </div>

            {/* --- CONTENIDO --- */}
            <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg">
                
                {/* 1. INFO TAB */}
                {activeTab === 'info' && (
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gray-600 rounded-full mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold">{localStorage.getItem("pong_user_nick")}</h2>
                        <p className="text-gray-400">ID: {localStorage.getItem("pong_user_id")}</p>
                        <hr className="my-4 border-gray-600"/>
                        <p>Estadísticas del jugador (Próximamente...)</p>
                    </div>
                )}

                {/* 2. FRIENDS TAB */}
                {activeTab === 'friends' && (
                    <div>
                        {/* Input temporal para añadir por ID */}
                        <div className="flex gap-2 mb-6 p-4 bg-gray-700 rounded">
                            <input 
                                type="number" 
                                placeholder="ID de usuario a añadir"
                                value={targetIdInput}
                                onChange={e => setTargetIdInput(e.target.value)}
                                className="flex-1 p-2 rounded text-black"
                            />
                            <button 
                                onClick={handleSendRequest}
                                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                            >
                                Añadir
                            </button>
                        </div>
                        {statusMsg && <p className="mb-4 text-yellow-400 text-sm">{statusMsg}</p>}

                        <h3 className="text-xl font-bold mb-4">Lista de Amigos</h3>
                        {friends.length === 0 ? (
                            <p className="text-gray-500 italic">No tienes amigos aún. ¡Añade a alguien!</p>
                        ) : (
                            <ul className="space-y-2">
                                {friends.map((f, i) => (
                                    <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                        <div className="flex items-center gap-3">
                                            {/* Indicador de estado (Dummy por ahora, luego irá con sockets) */}
                                            <div className="w-3 h-3 rounded-full bg-gray-400" title="Offline (Socket pendiente)"></div>
                                            <span className="font-bold">{f.friend_nick}</span>
                                            <span className="text-xs text-gray-400">({f.friend_lang})</span>
                                        </div>
                                        <button className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* 3. REQUESTS TAB */}
                {activeTab === 'requests' && (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Solicitudes Pendientes</h3>
                        {requests.length === 0 ? (
                            <p className="text-gray-500 italic">No tienes solicitudes pendientes.</p>
                        ) : (
                            <ul className="space-y-2">
                                {requests.map((r) => (
                                    <li key={r.id} className="flex justify-between items-center bg-gray-700 p-3 rounded border-l-4 border-yellow-500">
                                        <span><strong className="text-yellow-400">{r.nick}</strong> quiere ser tu amigo</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAccept(r.id)}
                                                className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
                                            >
                                                Aceptar
                                            </button>
                                            <button className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-500">
                                                Rechazar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default ProfileScreen;