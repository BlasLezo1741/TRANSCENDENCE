import { Controller, Get, Patch, Query, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Ruta: GET /chat/history?user1=X&user2=Y
  @Get('history')
  async getHistory(
    @Query('user1') user1: string,
    @Query('user2') user2: string,
  ) {
    // Convertimos a número porque por URL llegan como texto
    const id1 = parseInt(user1);
    const id2 = parseInt(user2);

    return await this.chatService.getConversation(id1, id2);
  }

  // Ruta: GET /chat/users?current=1
  @Get('users')
  async getUsers(@Query('current') currentUserId: string) {
    const id = parseInt(currentUserId);
    return await this.chatService.getUsers(id);
  }

  // 🔥 NUEVA RUTA: PATCH /chat/read
  // Se llama cuando haces clic en un chat para marcar mensajes como leídos
  @Patch('read')
  async markAsRead(@Body() body: { senderId: any, receiverId: any }) {
      //console.log("👀 [BACKEND] Solicitud de lectura recibida:", body);

      // Convertimos a Number para asegurar que la DB no reciba strings
      const sender = Number(body.senderId);
      const receiver = Number(body.receiverId);

      // Validación básica de seguridad
      if (!sender || !receiver) {
          console.error("❌ [BACKEND] Error: IDs inválidos recibidos:", body);
          return { success: false, msg: "IDs inválidos" };
      }

      return await this.chatService.markAsRead(sender, receiver);
  }

}

