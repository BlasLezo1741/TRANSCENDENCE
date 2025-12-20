import { io } from 'socket.io-client';

// Usamos la variable de entorno que definimos en Docker
// VITE_ permite que React acceda a ella en tiempo de ejecución
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Configuramos la conexión única
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket'], // Forzamos WebSocket para la V.19
  reconnection: true,        // Habilitamos reconexiones automáticas
  reconnectionAttempts: 5,
});

// Función para que tus compañeros envíen movimientos fácilmente
export const sendMove = (direction) => {
  if (socket.connected) {
    socket.emit('paddle_move', { direction });
  }
};