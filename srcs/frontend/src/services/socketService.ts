import { io, Socket } from 'socket.io-client';
import type { GameUpdatePayload, ScoreUpdatePayload } from '../ts/types';

// 1. Obtenemos la URL del .env
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

// 2. Verificación de seguridad
if (!SOCKET_URL) {
  console.error("⚠️ ERROR: VITE_BACKEND_URL no está definida en el archivo .env");
}

console.log("🔌 Intentando conectar al socket en:", SOCKET_URL);

// Variables de estado
let currentRoomId: string | null = null;
let currentMatchDbId: number | null = null;

// Configuración de la conexión
//export const socket: Socket = io(SOCKET_URL || 'http://localhost:3000', { // Fallback por seguridad
export const socket: Socket = io(SOCKET_URL, {
  //autoConnect: true,
  autoConnect: false, // Importante: No conectar hasta que tengamos el ID
  transports: ['polling', 'websocket'], 
  reconnection: true,
  reconnectionAttempts: 5,
  withCredentials: true,
  rememberUpgrade: true
});

// --- HELPER PARA OBTENER ID ---
const getMyId = () => {
    const id = localStorage.getItem("pong_user_id");
    return id ? parseInt(id, 10) : 0;
};

// --- CONEXION ---
//export const connectSocket = () => {
    //const userId = getMyId();
//CAMBIO TEMPORAL******************
export const connectSocket = (forceId?: number) => {
    // Si nos pasan un ID, lo usamos. Si no, miramos el localStorage
    const userId = forceId || getMyId();
//************************************ */
    if (userId) {
        // Actualizamos la query del socket con el ID del usuario
        socket.io.opts.query = { userId: userId.toString() };
        
        // Si no está conectado, conectamos
        if (!socket.connected) {
            console.log("🔌 Conectando socket con ID:", userId);
            socket.connect();
        }
    } else {
        console.warn("⚠️ Intentando conectar socket sin ID de usuario.");
    }
};

// Enviar mensaje de chat
export const sendDirectMessage = (receiverId: number, content: string) => {
  if (socket && socket.connected) {
      socket.emit('send_message', { receiverId, content });
  } else {
      console.error("❌ No se pudo enviar mensaje: Socket desconectado");
  }
};


// --- TESTIGOS DE CONEXIÓN ---
socket.on('connect', () => {
  console.log("✅ Conectado al Backend con ID:", socket.id);
});

socket.on('connect_error', (error) => {
  console.error("❌ Error de conexión al Socket:", error);
});

socket.on('disconnect', (reason) => {
    console.warn("⚠️ Desconectado del Backend:", reason);
});

// Variables reactivas simples por si las usas fuera de React (opcional)
export let matchData = { roomId: "", matchId: 0 };

// --- EMISORES (Enviar datos al servidor) ---

// Guarda los datos cuando llega el evento 'match_found'
export const setMatchData = (roomId: string, matchId: number) => {
    currentRoomId = roomId;
    currentMatchDbId = matchId;
    console.log(`🔒 Datos de partida guardados en servicio: Room=${roomId}, MatchDB=${matchId}`);
};

export const joinQueue = (nickname: string, mode: string) => {
  // Limpiamos datos anteriores para evitar mezclar partidas
  currentRoomId = null;
  currentMatchDbId = null;
  if (!socket.connected) {
      console.error("⚠️ No se puede enviar join_queue: Socket desconectado.");
      return;
  }

  console.log(`📡 [Socket] Emitiendo join_queue: Nick=${nickname}, Mode=${mode}`);
  
  // Enviamos el evento con la estructura que espera el Backend
  socket.emit('join_queue', { 
      nickname: nickname,
      mode: mode 
  }); 
};

export const sendMove = (direction: 'up' | 'down' | 'stop') => {
  if (socket.connected && currentRoomId) {
    socket.emit('paddle_move', { 
        roomId: currentRoomId, 
        direction 
    });
  } else {
    if (!currentRoomId) { /* console.warn("⚠️ Intento de movimiento sin sala."); */ }
  }
};

export const finishGame = (winnerName: string) => {
    // Verificamos que tengamos sala y ID de base de datos
    if (currentRoomId && currentMatchDbId) {
        console.log(`🏁 Enviando fin de juego. Ganador: ${winnerName} | MatchID: ${currentMatchDbId}`);
        socket.emit('finish_game', {
            roomId: currentRoomId,
            winnerId: winnerName,
            matchId: currentMatchDbId
        });
    } else {
        console.warn("⚠️ No se puede finalizar: Faltan datos (Room o DB ID)");
        console.log("Datos actuales -> Room:", currentRoomId, "DB ID:", currentMatchDbId);
    }
};

// --- RECEPTORES (Escuchar datos del servidor) ---

export const onMatchFound = (callback: (data: any) => void) => {
  socket.off('match_found');
  socket.on('match_found', (data) => {
    console.log("🎯 Match encontrado. Sala:", data.roomId, "| DB ID:", data.matchId);
    
    currentRoomId = data.roomId;
    currentMatchDbId = data.matchId;
    
    callback(data);
  });
};

export const onGameUpdate = (callback: (data: GameUpdatePayload) => void) => {
  socket.off('game_update');
  socket.on('game_update', callback);
};

export const onGameOver = (callback: (data: any) => void) => {
  socket.off('game_over');
  socket.on('game_over', (data) => {
    console.log("🏆 Game Over recibido. Ganador:", data.winner);
    currentRoomId = null;
    currentMatchDbId = null;
    callback(data);
  });
};

export const onPlayerOffline = (callback: (data: { userId: string, reconnectWindow: number }) => void) => {
  socket.off('player_offline');
  socket.on('player_offline', callback);
};

export const onScoreUpdate = (callback: (data: ScoreUpdatePayload) => void) => {
    socket.off('score_update');
    socket.on('score_update', callback);
};