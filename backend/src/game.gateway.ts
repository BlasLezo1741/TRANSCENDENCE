import { 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
/*
@WebSocketGateway({
  cors: {
    origin: '*', // Permitir que React se conecte
  },
})
*/
/*
@WebSocketGateway({
  cors: {
    origin: "http://localhost:5173", // El puerto de tu Frontend
    credentials: true
  },
})
*/

@WebSocketGateway({
  cors: {
    origin: true, // Permite que el socket acepte la conexión desde la URL de Codespaces
    credentials: true
  },
  transports: ['websocket']
})

export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

// Manejo de conexiones (V.19)
handleConnection(client: Socket) {
    console.log(`✅ Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  // EVENTO: Búsqueda de partida
  @SubscribeMessage('join_queue')
  handleJoinQueue(client: Socket, payload: { userId: string }) {
    console.log(`Buscando partida para: ${payload.userId}`);
    
    // LÓGICA TEMPORAL: Metemos a todos en la misma sala 'partida_1'
    // En el futuro, aquí irá vuestro sistema de Matchmaking
    const roomId = 'partida_1';
    client.join(roomId);

    this.server.to(roomId).emit('match_found', {
      roomId,
      message: 'Oponente encontrado. ¡Preparaos!',
    });
  }

  // EVENTO: Movimiento (Tu tabla de protocolos)
  @SubscribeMessage('paddle_move')
  handlePaddleMove(client: Socket, payload: { direction: string }) {
    // IMPORTANTE: Buscamos en qué sala está el jugador para no molestar a otros
    const roomId = Array.from(client.rooms)[1]; // La posición 1 suele ser la Room de juego

    if (roomId) {
      // Rebotamos el movimiento a la sala
      this.server.to(roomId).emit('game_update', {
        playerId: client.id,
        move: payload.direction
      });
    }
  }

  // EVENTO: Finalización (Para conectar con el ORM después)
  @SubscribeMessage('finish_game')
  handleFinishGame(client: Socket, payload: { winnerId: string }) {
    const roomId = Array.from(client.rooms)[1];
    this.server.to(roomId).emit('game_over', {
      winner: payload.winnerId,
      timestamp: new Date()
    });
  }
}