import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

// Definimos qué datos esperamos recibir del Frontend
interface SendMessageDto {
  receiverId: number;
  content: string;
}

@WebSocketGateway({ cors: { origin: '*' } }) // Permitimos conexión desde cualquier origen (Frontend)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server;

  // Inyectamos el ChatService para poder guardar en Base de Datos
  constructor(private readonly chatService: ChatService) {}

  // --- 1. GESTIÓN DE CONEXIONES ---
  handleConnection(client: Socket) {
    console.log(`🔌 [CHAT] Cliente conectado: ${client.id}`);
    // Aquí podrías leer el token del usuario si lo enviaras
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ [CHAT] Cliente desconectado: ${client.id}`);
  }

  // --- 2. EVENTOS ---

  // A. PING DE PRUEBA (El que ya tenías)
  @SubscribeMessage('ping_chat')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`📡 [CHAT] Ping recibido de ${client.id}`);
    client.emit('pong_chat', { msg: 'Pong desde el Backend!', received: data });
  }

  // B. UNIRSE A SALA PRIVADA (Para recibir mensajes)
  @SubscribeMessage('join_chat')
  handleJoinChat(@MessageBody() data: { userId: number }, @ConnectedSocket() client: Socket) {
    // Creamos una sala única para este usuario: "user_1", "user_2", etc.
    const roomName = `user_${data.userId}`;
    client.join(roomName);
    console.log(`👤 Usuario ${data.userId} escuchando en sala: ${roomName}`);
  }

  // C. ENVIAR MENSAJE (¡LO QUE TE FALTABA!)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: SendMessageDto, 
    @ConnectedSocket() client: Socket
  ) {
    // 1. Log para ver que ha llegado
    console.log(`📨 [GATEWAY] Mensaje recibido para ${payload.receiverId}: ${payload.content}`);

    // 2. Obtener quién envía el mensaje
    // NOTA: Como estamos probando, vamos a sacar el ID de la query del socket o asumir que es el 1 temporalmente.
    // En el futuro esto vendrá del Token de autenticación.
    const senderId = client.handshake.query.userId ? Number(client.handshake.query.userId) : 1;

    try {
        // 3. Guardar en Base de Datos
        const savedMsg = await this.chatService.saveDirectMessage(senderId, payload.receiverId, payload.content);
        console.log("✅ Mensaje guardado en DB:", savedMsg);

        // 4. Enviar al Destinatario (a su sala privada)
        this.server.to(`user_${payload.receiverId}`).emit('receive_message', savedMsg);

        // 5. Devolver confirmación al que envió (para que pinte el doble check o similar)
        client.emit('message_sent', savedMsg);

    } catch (error) {
        console.error("❌ Error guardando mensaje:", error);
    }
  }
}