import { io, Socket } from 'socket.io-client';

// Usamos la variable de entorno que definimos en Docker
// VITE_ permite que React acceda a ella en tiempo de ejecución
//const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
// 1. Obtenemos la URL del .env
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL
// 2. Verificación de seguridad para ti como desarrolladora
if (!SOCKET_URL) {
  console.error("⚠️ ERROR: VITE_BACKEND_URL no está definida en el archivo .env");
}

// Variable interna para recordar en qué sala está jugando el usuario
let currentRoomId: string | null = null;

// Configuramos la conexión única
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['polling', 'websocket'], // Forzamos WebSocket para la V.19
  //secure: true,
  reconnection: true,        // Habilitamos reconexiones automáticas
  reconnectionAttempts: 5,
  withCredentials: true,
  // Esta opción ayuda a que el handshake no falle en proxies estrictos
  rememberUpgrade: true
  // Forzamos a que socket.io no intente otros caminos si falla el primero
  //forceNew: true,
});
// --- COMIENZA EL TESTIGO DE CONEXIÓN ---
socket.on('connect', () => {
  console.log("✅ Conectado al Backend con ID:", socket.id);
});

socket.on('connect_error', (error) => {
  console.error("❌ Error de conexión al Socket:", error);
});
// --- TERMINA EL TESTIGO DE CONEXIÓN ---

// --- EMISORES (Enviar datos al servidor) ---
export const joinQueue = (userId: string, mode: string) => {
  console.log(`📡 Socket emitiendo join_queue: User=${userId}, Mode=${mode}`);
  socket.emit('join_queue', { userId, mode }); 
};

// Enviar movimiento
export const sendMove = (direction: 'up' | 'down' | 'stop') => {
  if (socket.connected && currentRoomId) {
    socket.emit('paddle_move', { 
        roomId: currentRoomId, // <--- INYECTAMOS EL ID DE LA SALA
        direction 
    });
  } else {
    // Solo mostramos warning si intenta mover sin estar en partida (opcional)
    if (!currentRoomId) console.warn("⚠️ Intento de movimiento sin sala asignada.");
  }
};

export const finishGame = (winnerId: string) => {
    if (currentRoomId) {
        socket.emit('finish_game', {
            roomId: currentRoomId,
            winnerId: winnerId
        });
    }
};

// --- RECEPTORES (Escuchar datos del servidor) ---
// MODIFICADO: Interceptamos el evento para guardar el roomId
// Usamos callbacks para que los componentes de React reaccionen
export const onMatchFound = (callback: (data: any) => void) => {
  socket.on('match_found', (data) => {
    console.log("🎯 Match encontrado. Sala guardada:", data.roomId);
    currentRoomId = data.roomId; // <--- GUARDAMOS LA REFERENCIA AQUÍ
    callback(data); // Pasamos los datos al componente React
  });
};

export const onGameUpdate = (callback: (data: any) => void) => {
  socket.on('game_update', callback);
};

export const onGameOver = (callback: (data: any) => void) => {
  socket.on('game_over', (data) => {
    currentRoomId = null; // Limpiamos la sala al terminar
    callback(data);
  });
};

export const onPlayerOffline = (callback: (data: { userId: string, reconnectWindow: number }) => void) => {
  socket.on('player_offline', callback);
};

export const onScoreUpdate = (callback: (data: any) => void) => {
    socket.on('score_update', callback);
};