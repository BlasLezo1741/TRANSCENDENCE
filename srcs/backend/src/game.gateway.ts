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
import { GameUpdateResponse } from './dto/game-update.response';
import { ScoreUpdateResponse } from './dto/score-update.response';

// --- CAMBIO PARA DRIZZLE ---
import { DRIZZLE } from './database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema'; // Importamos todas las tablas juntas
import { eq, sql } from 'drizzle-orm'; // Operadores: eq (igual), sql (para fechas)
// ---------------------------

//@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) // Protección global del Gateway
@UsePipes(new ValidationPipe({ whitelist: true }))

@WebSocketGateway({
  cors: {
    // Permitimos explícitamente tu URL de frontend y también 'true' para mayor compatibilidad
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket']
})


export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

//AÑADIMOS EL CONSTRUCTOR PARA DRIZZLE PARA INYECTAR LA DB
constructor(
    @Inject(DRIZZLE) 
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}


// Manejo de conexiones (V.19)
handleConnection(client: Socket) {
    console.log(`✅ Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
    // Notificamos la desconexión al resto (Módulo Web)
    this.server.emit('player_offline', {
      userId: client.id,
      reconnectWindow: 30
    });
  }

  // EVENTO: Búsqueda de partida (Validado con DTO)
@SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: JoinQueueDto 
  ) {
    console.log(`📢 [DRIZZLE] Buscando modo: ${payload.mode}`);

    try {
      // PASO 1: Buscar el ID numérico del modo (ej: "1v1_local" -> ID 1)
      // Usamos 'findFirst' para buscar en la tabla match_mode
      const modeResult = await this.db.query.matchMode.findFirst({
        where: eq(schema.matchMode.mmodName, payload.mode)
      });

      // Validación: Si no existe el modo en la DB, paramos para no romper nada
      if (!modeResult) {
        console.error(`❌ Error: El modo '${payload.mode}' no existe en la tabla match_mode.`);
        console.error('💡 PISTA: ¿Has ejecutado los INSERT en la base de datos?');
        return;
      }

      // PASO 2: Insertar la partida usando el ID encontrado (mmodPk)
      const newMatch = await this.db.insert(schema.match).values({
        mModeFk: modeResult.mmodPk, // <--- Aquí usamos el número (Foreign Key)
        mDate: sql`NOW()`,          // Generamos la fecha actual en Postgres
      }).returning({ insertedId: schema.match.mPk }); // Pedimos que devuelva el ID creado

      console.log(`✅ Partida insertada. ID Partida: ${newMatch[0].insertedId} | Modo ID: ${modeResult.mmodPk}`);

    } catch (error) {
      console.error('❌ Error crítico al guardar en DB:', error);
      // No hacemos 'return' aquí para permitir que sigan jugando aunque falle el guardado (opcional)
    }

    // --- LÓGICA DE SOCKETS (se mantiene igual) ---
    const roomId = `room_${payload.mode}_${client.id}`;
    client.join(roomId);

    const response: MatchFoundResponse = {
      roomId,
      side: 'left',
      opponent: { name: 'DrizzleBot', avatar: 'default.png' }
    };

    this.server.to(roomId).emit('match_found', response);
  }

// EVENTO: Movimiento (Validado con DTO - para el modulo de gaming)
  @SubscribeMessage('paddle_move')
  handlePaddleMove(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: PaddleMoveDto // Ahora usa el DTO
  ) {
    const roomId = Array.from(client.rooms)[1];

    if (roomId) {
      this.server.to(roomId).emit('game_update', {
        playerId: client.id,
        move: payload.direction // Solo llegará si es up/down/stop
      });
    }
  }

// EVENTO: Finalización (Validado con DTO para el módulo User Management)
@SubscribeMessage('finish_game')
  handleFinishGame(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: FinishGameDto // Aplicamos el contrato de datos
  ) {
    // Buscamos la sala para notificar a ambos jugadores
    const roomId = payload.roomId || Array.from(client.rooms)[1];

    console.log(`🏆 Partida finalizada. Ganador: ${payload.winnerId} en sala: ${roomId}`);

    if (roomId) {
      this.server.to(roomId).emit('game_over', {
        winner: payload.winnerId,
        timestamp: new Date().toISOString(),
        status: 'validated' // Indicamos que los datos pasaron el protocolo
      });
    }
  }
  // MÉTODO AUXILIAR: Para el marcador de puntos
  emitScore(roomId: string, scorerId: string, newScore: [number, number]) {
    const payload: ScoreUpdateResponse = {
      score: newScore,
      scorerId: scorerId
    };
    this.server.to(roomId).emit('score_update', payload);
  }
}
