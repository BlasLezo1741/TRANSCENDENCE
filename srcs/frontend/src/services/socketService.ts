import { io, Socket } from 'socket.io-client';

// 1. Obtenemos la URL del .env
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

// 2. Verificación de seguridad
if (!SOCKET_URL) {
  console.error("⚠️ ERROR: VITE_BACKEND_URL no está definida en el archivo .env");
}

// Variables de estado
let currentRoomId: string | null = null;
let currentMatchDbId: number | null = null;

// Configuración de la conexión
export const socket: Socket = io(SOCKET_URL || 'http://localhost:3000', { // Fallback por seguridad
  autoConnect: true,
  transports: ['polling', 'websocket'], 
  reconnection: true,
  reconnectionAttempts: 5,
  withCredentials: true,
  rememberUpgrade: true
});

// --- TESTIGOS DE CONEXIÓN ---
socket.on('connect', () => {
  console.log("✅ Conectado al Backend con ID:", socket.id);
});

socket.on('connect_error', (error) => {
  console.error("❌ Error de conexión al Socket:", error);
});

// --- EMISORES (Enviar datos al servidor) ---

export const joinQueue = (userId: string, mode: string) => {
  // Limpiamos datos anteriores para evitar mezclar partidas
  currentRoomId = null;
  currentMatchDbId = null;
  
  console.log(`📡 Socket emitiendo join_queue: User=${userId}, Mode=${mode}`);
  socket.emit('join_queue', { userId, mode }); 
};

export const sendMove = (direction: 'up' | 'down' | 'stop') => {
  if (socket.connected && currentRoomId) {
    socket.emit('paddle_move', { 
        roomId: currentRoomId, 
        direction 
    });
  } else {
    // Evitamos spam de logs si no hay sala
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
            matchId: currentMatchDbId // <--- ENVIAMOS EL ID AL BACKEND
        });
    } else {
        console.warn("⚠️ No se puede finalizar: Faltan datos (Room o DB ID)");
        console.log("Datos actuales -> Room:", currentRoomId, "DB ID:", currentMatchDbId);
    }
};

// --- RECEPTORES (Escuchar datos del servidor) ---

export const onMatchFound = (callback: (data: any) => void) => {
  socket.off('match_found'); // <--- MEJORA: Evita duplicados si React renderiza dos veces
  socket.on('match_found', (data) => {
    console.log("🎯 Match encontrado. Sala:", data.roomId, "| DB ID:", data.matchId);
    
    currentRoomId = data.roomId;      // Guardamos la sala
    currentMatchDbId = data.matchId;  // Guardamos el ID de la BD
    
    callback(data);
  });
};

export const onGameUpdate = (callback: (data: any) => void) => {
  socket.off('game_update'); // <--- MEJORA DE LIMPIEZA
  socket.on('game_update', callback);
};

export const onGameOver = (callback: (data: any) => void) => {
  socket.off('game_over'); // <--- MEJORA DE LIMPIEZA
  socket.on('game_over', (data) => {
    console.log("🏆 Game Over recibido. Ganador:", data.winner);
    currentRoomId = null;     // Limpiamos memoria
    currentMatchDbId = null;  // Limpiamos memoria
    callback(data);
  });
};

export const onPlayerOffline = (callback: (data: { userId: string, reconnectWindow: number }) => void) => {
  socket.off('player_offline');
  socket.on('player_offline', callback);
};

export const onScoreUpdate = (callback: (data: any) => void) => {
    socket.off('score_update');
    socket.on('score_update', callback);
};