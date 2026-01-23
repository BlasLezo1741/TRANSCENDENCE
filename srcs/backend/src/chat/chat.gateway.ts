import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } }) // Permitimos conexión desde cualquier origen (Frontend)
export class ChatGateway {
  
  @WebSocketServer()
  server: Server;

  // 1. EVENTO DE PRUEBA: El frontend envía 'ping', nosotros respondemos 'pong'
  @SubscribeMessage('ping_chat')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`📡 [CHAT] Mensaje recibido de ${client.id}:`, data);
    
    // Respondemos solo al que envió el mensaje
    client.emit('pong_chat', { msg: 'Hola desde el Chat Gateway!', received: data });
  }

  // Aquí iremos añadiendo la lógica real (enviar mensaje, unirse a sala...)
}