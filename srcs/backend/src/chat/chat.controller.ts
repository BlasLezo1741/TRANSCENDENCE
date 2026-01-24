import { Controller, Get, Query } from '@nestjs/common';
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
}

