import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // ==========================================
  // 1. OBTENER MI LISTA DE AMIGOS (GET)
  // ==========================================
  // El frontend llama a: /friends/list?userId=1
  @Get('list')
  async getFriends(@Query('userId') userId: string) {
    //console.log(`🔍 [DEBUG] Solicitando lista de amigos para User ID: ${userId}`); // Chivato
    return this.friendsService.getFriends(Number(userId));
  }
  
  // ==========================================
  // 2. ENVIAR SOLICITUD (POST)
  // ==========================================
  @Post('request')
  async sendRequest(@Body() body: { userId: number, targetId: number }) {
      // LOG PARA DEPURAR: Ver qué llega exactamente
      //console.log("📥 [CONTROLLER] Payload recibido:", body);

      // GUARDA DE SEGURIDAD:
      // Si userId o targetId no existen, devolvemos error controlado en vez de romper SQL.
      if (!body.userId || !body.targetId) {
          console.error("❌ [ERROR] Faltan IDs. Recibido:", body);
          return { ok: false, msg: "Error: IDs no válidos" };
      }

      // Convertimos a Number por seguridad (a veces llega como string "1")
      return this.friendsService.sendRequest(Number(body.userId), Number(body.targetId));
  }

  // ==========================================
  // 3. ACEPTAR SOLICITUD (POST)
  // ==========================================
  @Post('accept')
  async acceptRequest(@Body() body: { userId: number, targetId: number }) {
      //console.log(`🤝 [DEBUG] User ${body.userId} acepta a ${body.targetId}`);
      return this.friendsService.acceptRequest(body.userId, body.targetId);
  }

  // ==========================================
  // 4. BLOQUEAR USUARIO (POST)
  // ==========================================
  @Post('block')
  async blockUser(@Body() body: { userId: number, targetId: number }) {
      return this.friendsService.blockUser(body.userId, body.targetId);
  }

  // ==========================================
  // 5. SOLICITUDES PENDIENTES (GET)
  // ==========================================
  // Ojo: Lo cambiamos a GET porque fetch por defecto para leer datos suele ser GET
  @Get('pending')
  async getPending(@Query('userId') userId: string) {
      //console.log(`📬 [DEBUG] User ${userId} consulta PENDIENTES`);
      return this.friendsService.getPendingRequests(Number(userId));
  }

  // ==========================================
  // 6. CANDIDATOS PARA INVITAR (GET)
  // ==========================================
  @Get('candidates')
  async getCandidates(@Query('userId') userId: string) {
    return this.friendsService.getUsersToInvite(Number(userId));
  }
  // ==========================================
  // 7. ELIMINAR AMIGO (POST)
  // ==========================================
  @Post('remove')
  async removeFriend(@Body() body: { userId: number, targetId: number }) {
      if (!body.userId || !body.targetId) {
          return { ok: false, msg: "IDs inválidos" };
      }
      return this.friendsService.removeFriend(Number(body.userId), Number(body.targetId));
  }
}

