import { 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Permitir que React se conecte
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Jugador conectado (ID: ${client.id})`);
    // Aquí podrías meterlo en una "Sala" (Room) automáticamente
  }

  handleDisconnect(client: Socket) {
    console.log(`Jugador desconectado (ID: ${client.id})`);
  }

  // Aquí recibes lo que enviaste desde React
  @SubscribeMessage('paddle_move')
  handlePaddleMove(client: Socket, payload: { direction: string }) {
    console.log(`Movimiento recibido de ${client.id}: ${payload.direction}`);
    
    // Reenviamos a todos los demás para el módulo "Remote Players"
    // En una fase avanzada, solo lo enviarías a la sala (room) de la partida
    this.server.emit('game_update', {
      playerId: client.id,
      move: payload.direction
    });
  }
}