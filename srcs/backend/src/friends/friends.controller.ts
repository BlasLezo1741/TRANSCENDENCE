import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendActionDto } from './friends.dto';

// Si tienes AuthGuard, descomenta esto:
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // POST /friends/request -> Enviar solicitud
  @Post('request')
  async sendRequest(@Body() body: { myId: number, targetId: number }) {
      // PROD: usar req.user.id en lugar de body.myId
      return this.friendsService.sendRequest(body.myId, body.targetId);
  }

  // POST /friends/accept -> Aceptar solicitud
  @Post('accept')
  async acceptRequest(@Body() body: { myId: number, targetId: number }) {
      return this.friendsService.acceptRequest(body.myId, body.targetId);
  }

  // POST /friends/block -> Bloquear
  @Post('block')
  async blockUser(@Body() body: { myId: number, targetId: number }) {
      return this.friendsService.blockUser(body.myId, body.targetId);
  }

  // GET /friends/list -> Mis amigos
  @Post('list') // Uso POST para pasar el ID facil por body en pruebas
  async getFriends(@Body() body: { myId: number }) {
      return this.friendsService.getFriends(body.myId);
  }

  // GET /friends/pending -> Solicitudes pendientes
  @Post('pending')
  async getPending(@Body() body: { myId: number }) {
      return this.friendsService.getPendingRequests(body.myId);
  }
}