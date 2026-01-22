// import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
// import { FriendsService } from './friends.service';
// import { FriendActionDto } from './friends.dto';

// // Si tienes AuthGuard, descomenta esto:
// // import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// @Controller('friends')
// export class FriendsController {
//   constructor(private readonly friendsService: FriendsService) {}

//   // Listar amigos
//   @Get('list')
//   async getFriends(@Query('userId') userId: string) {
//     return this.friendsService.getFriends(Number(userId));
//   }
  
//   // POST /friends/request -> Enviar solicitud
//   @Post('request')
//   async sendRequest(@Body() body: { myId: number, targetId: number }) {
//       // PROD: usar req.user.id en lugar de body.myId
//       return this.friendsService.sendRequest(body.myId, body.targetId);
//   }

//   // POST /friends/accept -> Aceptar solicitud
//   @Post('accept')
//   async acceptRequest(@Body() body: { myId: number, targetId: number }) {
//       return this.friendsService.acceptRequest(body.myId, body.targetId);
//   }

//   // POST /friends/block -> Bloquear
//   @Post('block')
//   async blockUser(@Body() body: { myId: number, targetId: number }) {
//       return this.friendsService.blockUser(body.myId, body.targetId);
//   }

//   // GET /friends/list -> Mis amigos
//   @Post('list') // Uso POST para pasar el ID facil por body en pruebas
//   async getFriends(@Body() body: { myId: number }) {
//       return this.friendsService.getFriends(body.myId);
//   }

//   // GET /friends/pending -> Solicitudes pendientes
//   @Post('pending')
//   async getPending(@Body() body: { myId: number }) {
//       return this.friendsService.getPendingRequests(body.myId);
//   }

//   // 🔥 5. ESTE ES EL QUE TE FALTA: Obtener candidatos para invitar
//   @Get('candidates')
//   async getCandidates(@Query('userId') userId: string) {
//     return this.friendsService.getUsersToInvite(Number(userId));
//   }

// }
/************************************************ */
// import { Controller, Post, Get, Body, Query } from '@nestjs/common';
// import { FriendsService } from './friends.service';

// @Controller('friends')
// export class FriendsController {
//   constructor(private readonly friendsService: FriendsService) {}

//   // 1. GET /friends/list?userId=1
//   // El frontend usa GET, así que mantenemos este y BORRAMOS el POST duplicado
//   @Get('list')
//   async getFriends(@Query('userId') userId: string) {
//     return this.friendsService.getFriends(Number(userId));
//   }
  
//   // 2. POST /friends/request 
//   // Frontend envía: { userId, targetId }
//   @Post('request')
//   async sendRequest(@Body() body: { userId: number, targetId: number }) {
//       return this.friendsService.sendRequest(body.userId, body.targetId);
//   }

//   // 3. POST /friends/accept
//   // Frontend envía: { userId, targetId }
//   @Post('accept')
//   async acceptRequest(@Body() body: { userId: number, targetId: number }) {
//       return this.friendsService.acceptRequest(body.userId, body.targetId);
//   }

//   // 4. POST /friends/block
//   @Post('block')
//   async blockUser(@Body() body: { userId: number, targetId: number }) {
//       return this.friendsService.blockUser(body.userId, body.targetId);
//   }

//   // 5. GET /friends/pending?userId=1
//   // CAMBIO IMPORTANTE: Lo he pasado a GET porque el frontend usa fetch(URL) sin body
//   @Get('pending')
//   async getPending(@Query('userId') userId: string) {
//       return this.friendsService.getPendingRequests(Number(userId));
//   }

//   // 6. GET /friends/candidates?userId=1
//   @Get('candidates')
//   async getCandidates(@Query('userId') userId: string) {
//     return this.friendsService.getUsersToInvite(Number(userId));
//   }
// }

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
    console.log(`🔍 [DEBUG] Solicitando lista de amigos para User ID: ${userId}`); // Chivato
    return this.friendsService.getFriends(Number(userId));
  }
  
  // ==========================================
  // 2. ENVIAR SOLICITUD (POST)
  // ==========================================
  // // Frontend envía: { userId, targetId }
  // @Post('request')
  // async sendRequest(@Body() body: { userId: number, targetId: number }) {
  //     console.log(`📤 [DEBUG] User ${body.userId} envía solicitud a ${body.targetId}`);
  //     return this.friendsService.sendRequest(body.userId, body.targetId);
  // }
  // 2. ENVIAR SOLICITUD (POST)
  @Post('request')
  async sendRequest(@Body() body: { userId: number, targetId: number }) {
      // LOG PARA DEPURAR: Ver qué llega exactamente
      console.log("📥 [CONTROLLER] Payload recibido:", body);

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
      console.log(`🤝 [DEBUG] User ${body.userId} acepta a ${body.targetId}`);
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
      console.log(`📬 [DEBUG] User ${userId} consulta PENDIENTES`);
      return this.friendsService.getPendingRequests(Number(userId));
  }

  // ==========================================
  // 6. CANDIDATOS PARA INVITAR (GET)
  // ==========================================
  @Get('candidates')
  async getCandidates(@Query('userId') userId: string) {
    return this.friendsService.getUsersToInvite(Number(userId));
  }
}