import { 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody      
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsePipes, ValidationPipe, Inject } from '@nestjs/common';

// DTOs (Entrada)
import { JoinQueueDto } from './dto/join-queue.dto';
import { PaddleMoveDto } from './dto/paddle-move.dto';
import { FinishGameDto } from './dto/finish-game.dto';

// Interfaces (Salida)
import { MatchFoundResponse } from './dto/match-found.response';
import { ScoreUpdateResponse } from './dto/score-update.response';
// import { GameUpdateResponse } from './dto/game-update.response'; // Descomentar si la usas

// --- DRIZZLE & DB ---
import { DRIZZLE } from './database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema'; 
import { eq, sql } from 'drizzle-orm'; 
// --------------------

@UsePipes(new ValidationPipe({ whitelist: true }))
@WebSocketGateway({
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket']
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(DRIZZLE) 
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // --- CONEXIÓN / DESCONEXIÓN ---

  handleConnection(client: Socket) {
    console.log(`✅ Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
    this.server.emit('player_offline', {
      userId: client.id,
      reconnectWindow: 30
    });
  }

  // --- JOIN QUEUE (Inicio de partida + DB Insert) ---

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: JoinQueueDto 
  ) {
    console.log(`📢 [DRIZZLE] Buscando modo: ${payload.mode}`);

    try {
      // 1. Buscar ID del modo
      const modeResult = await this.db.query.matchMode.findFirst({
        where: eq(schema.matchMode.mmodName, payload.mode)
      });

      if (!modeResult) {
        console.error(`❌ Error: El modo '${payload.mode}' no existe en la tabla match_mode.`);
        return;
      }

      // 2. Insertar partida en DB
      const newMatch = await this.db.insert(schema.match).values({
        mModeFk: modeResult.mmodPk,
        mDate: sql`NOW()`,
      }).returning({ insertedId: schema.match.mPk });

      console.log(`✅ Partida insertada. ID Partida: ${newMatch[0].insertedId} | Modo ID: ${modeResult.mmodPk}`);

      // 3. Gestión de Sala y Respuesta
      const roomId = `room_${payload.mode}_${client.id}`;
      
      // IMPORTANTE: Esperar a que el join se complete antes de emitir
      await client.join(roomId); 
      console.log(`🚪 Cliente ${client.id} unido a sala: ${roomId}`);

      const response: MatchFoundResponse = { 
        roomId,
        matchId: newMatch[0].insertedId, // Enviamos el ID de DB al frontend
        side: 'left',
        opponent: { name: 'DrizzleBot', avatar: 'default.png' }
      };

      // Emitir DIRECTAMENTE al cliente para asegurar que recibe el ID
      client.emit('match_found', response);

    } catch (error) {
      console.error('❌ Error crítico en handleJoinQueue:', error);
    }
  }

  // --- PADDLE MOVE (Juego en tiempo real) ---

  @SubscribeMessage('paddle_move')
  handlePaddleMove(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: PaddleMoveDto 
  ) {
    // console.log(`🏓 [MOVE] Cliente: ${client.id} | Dir: ${payload.direction}`);
    
    // Seguridad: Verificar que el socket pertenece a la sala que dice
    if (!client.rooms.has(payload.roomId)) {
        console.warn(`⚠️ Alerta: El usuario ${client.id} intentó mover en una sala ajena.`);
        return;
    }

    // Reenviar movimiento al oponente (Broadcast a la sala, excluyendo al emisor)
    client.to(payload.roomId).emit('game_update', {
      playerId: client.id,
      move: payload.direction
    });
  }

  // --- FINISH GAME (Cierre de partida + DB Update) ---

  @SubscribeMessage('finish_game')
  async handleFinishGame(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: FinishGameDto 
  ) {
    console.log(`🏁 [FIN] Sala: ${payload.roomId} | Ganador: ${payload.winnerId} | Match PK: ${payload.matchId}`);

    // Seguridad básica
    if (!client.rooms.has(payload.roomId)) {
        console.warn(`⚠️ Intento de cerrar juego ajeno. User: ${client.id}`);
    }

    try {
        // 1. Buscar ID del Jugador Ganador por su Nick
        const winnerPlayer = await this.db.query.player.findFirst({
            where: eq(schema.player.pNick, payload.winnerId)
        });

        if (winnerPlayer) {
            // 2. Actualizar la partida con el Ganador y Duración
            await this.db.update(schema.match)
                .set({ 
                    mWinnerFk: winnerPlayer.pPk, 
                    mDuration: sql`NOW() - m_date` 
                }) 
                .where(eq(schema.match.mPk, payload.matchId));
            
            console.log(`💾 ¡Guardado! Ganador ID: ${winnerPlayer.pPk} (${winnerPlayer.pNick})`);
        } else {
            console.warn(`⚠️ No se pudo guardar: El usuario '${payload.winnerId}' no existe en la DB.`);
        }

    } catch (error) {
        console.error('❌ Error al actualizar DB:', error);
    }

    // 3. Notificar Fin de Juego
    this.server.to(payload.roomId).emit('game_over', { winner: payload.winnerId });

    // 4. Limpieza de sala
    const sockets = await this.server.in(payload.roomId).fetchSockets();
    for (const s of sockets) {
        s.leave(payload.roomId);
    }
    
    console.log(`🗑️ Sala ${payload.roomId} limpiada.`);
  }

  // --- AUXILIAR (Futuro uso) ---
  emitScore(roomId: string, scorerId: string, newScore: [number, number]) {
    const payload: ScoreUpdateResponse = {
      score: newScore,
      scorerId: scorerId
    };
    this.server.to(roomId).emit('score_update', payload);
  }
}
