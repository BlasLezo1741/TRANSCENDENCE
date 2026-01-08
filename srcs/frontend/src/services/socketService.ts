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

socket.on('disconnect', (reason) => {
    console.warn("⚠️ Desconectado del Backend:", reason);
});

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
  // Nota: El backend espera { nickname: string, mode: string }
  socket.emit('join_queue', { 
      nickname: nickname, // Mapeamos el argumento a la propiedad 'nickname'
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

export const onGameUpdate = (callback: (data: GameUpdatePayload) => void) => {
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

export const onScoreUpdate = (callback: (data: ScoreUpdatePayload) => void) => {
    socket.off('score_update');
    socket.on('score_update', callback);
};