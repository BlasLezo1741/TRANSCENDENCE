import { socket } from './socketService';

//const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// --- INTERFACES ---
export interface Friend {
    id: number;
    friend_nick: string;
    friend_lang: string;
    friendship_since: string;
    status: 'online' | 'offline' | 'ingame';
}

export interface PendingRequest {
    id: number;
    nick: string;
}

export interface UserCandidate {
    id: number;
    nick: string;
}

// --- API CALLS ---

// 1. Obtener mis amigos (GET)
export const getMyFriends = async (): Promise<Friend[]> => {
    const userId = localStorage.getItem("pong_user_id");
    
    const response = await fetch(`/friends/list?userId=${userId}`);
    
    if (!response.ok) throw new Error("Error fetching friends");
    return await response.json();
};

// 2. Obtener solicitudes pendientes (GET)
export const getPendingRequests = async (): Promise<PendingRequest[]> => {
    const userId = localStorage.getItem("pong_user_id");
    
    const response = await fetch(`/friends/pending?userId=${userId}`);
    
    if (!response.ok) throw new Error("Error fetching requests");
    return await response.json();
};

// 3. ENVIAR SOLICITUD DE AMISTAD (POST)
export const sendFriendRequest = async (targetId: number) => {
    const storedId = localStorage.getItem("pong_user_id");
    
    if (!storedId) {
        console.error("❌ Error CRÍTICO: No hay 'pong_user_id' en localStorage.");
        return { ok: false, msg: "Error de sesión: Recarga la página" };
    }

    const userId = parseInt(storedId); 

    //console.log(`📤 [FRONT] Enviando solicitud: Yo (${userId}) -> Él (${targetId})`);

    const response = await fetch(`/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId }) // Clave correcta: userId
    });

    if (!response.ok) {
        const err = await response.json();
        console.error("❌ Error del servidor:", err);
        return { ok: false, msg: "Error en el servidor" };
    }

    return await response.json();
};

// 4. ACEPTAR SOLICITUD (POST) - CORREGIDO
export const acceptFriendRequest = async (targetId: number) => {
    const storedId = localStorage.getItem("pong_user_id");
    const userId = storedId ? parseInt(storedId) : 0;

    const response = await fetch(`/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🔥 CORREGIDO: Antes enviabas myId, ahora userId para coincidir con el backend
        body: JSON.stringify({ userId, targetId }) 
    });
    return await response.json();
};

// 5. BLOQUEAR USUARIO (POST) - CORREGIDO
export const blockUser = async (targetId: number) => {
    const storedId = localStorage.getItem("pong_user_id");
    const userId = storedId ? parseInt(storedId) : 0;

    const response = await fetch(`/friends/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🔥 CORREGIDO: Antes enviabas myId, ahora userId
        body: JSON.stringify({ userId, targetId })
    });
    return await response.json();
};

// 6. Obtener usuarios para invitar (GET)
export const getUsersToInvite = async (): Promise<UserCandidate[]> => {
    const userId = localStorage.getItem("pong_user_id");
    
    const response = await fetch(`/friends/candidates?userId=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error("Error fetching candidates");
    }
    
    return await response.json();
};

// 7. ELIMINAR AMIGO
export const removeFriend = async (targetId: number) => {
    const storedId = localStorage.getItem("pong_user_id");
    if (!storedId) return { ok: false, msg: "Error de sesión" };
    
    const userId = parseInt(storedId);

    const response = await fetch(`/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId })
    });

    return await response.json();
};