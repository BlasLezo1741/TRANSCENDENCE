const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Helper para obtener el ID del usuario logueado
const getMyId = (): number => {
    const id = localStorage.getItem("pong_user_id");
    return id ? parseInt(id, 10) : 0;
};

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

// --- API CALLS ---

// 1. Obtener lista de amigos confirmados
export const getMyFriends = async (): Promise<Friend[]> => {
    const myId = getMyId();
    try {
        const response = await fetch(`${API_URL}/friends/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ myId })
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Error fetching friends:", e);
        return [];
    }
};

// 2. Obtener solicitudes pendientes (Gente que quiere ser tu amiga)
export const getPendingRequests = async (): Promise<PendingRequest[]> => {
    const myId = getMyId();
    try {
        const response = await fetch(`${API_URL}/friends/pending`, {
            method: 'POST', // Ojo, definimos POST en el controller
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ myId })
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Error fetching requests:", e);
        return [];
    }
};

// 3. Enviar una solicitud de amistad
export const sendFriendRequest = async (targetId: number) => {
    const myId = getMyId();
    const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myId, targetId })
    });
    return await response.json(); // { ok: true, msg: ... }
};

// 4. Aceptar solicitud
export const acceptFriendRequest = async (targetId: number) => {
    const myId = getMyId();
    const response = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myId, targetId })
    });
    return await response.json();
};

// 5. Bloquear usuario
export const blockUser = async (targetId: number) => {
    const myId = getMyId();
    const response = await fetch(`${API_URL}/friends/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myId, targetId })
    });
    return await response.json();
};