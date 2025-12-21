import { io, Socket } from 'socket.io-client';

// Usamos la variable de entorno que definimos en Docker
// VITE_ permite que React acceda a ella en tiempo de ejecución
//const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const SOCKET_URL = 'https://sturdy-happiness-jjjjw444x7q7h57q6-3000.app.github.dev';

// Configuramos la conexión única
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket'], // Forzamos WebSocket para la V.19
  secure: true,
  reconnection: true,        // Habilitamos reconexiones automáticas
  reconnectionAttempts: 5,
});

// --- EMISORES (Enviar datos al servidor) ---

// Buscar partida
export const joinQueue = (userId: string) => {
  socket.emit('join_queue', { userId, mode: '1v1' });
};

// Enviar movimiento (Ya lo tenías, lo mantenemos)
export const sendMove = (direction: 'up' | 'down' | 'stop') => {
  if (socket.connected) {
    socket.emit('paddle_move', { direction });
  }
};

// --- RECEPTORES (Escuchar datos del servidor) ---

// Usamos callbacks para que los componentes de React reaccionen
export const onMatchFound = (callback: (data: any) => void) => {
  socket.on('match_found', callback);
};

export const onGameUpdate = (callback: (data: any) => void) => {
  socket.on('game_update', callback);
};

export const onGameOver = (callback: (data: any) => void) => {
  socket.on('game_over', callback);
};