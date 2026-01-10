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
import { GameUpdateResponse } from './dto/game-update.response'; // Descomentar si la usas

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

//Mapa para gestionar colas por modo de juego (ej: '1v1_remote' -> [Socket])
  private queues: Map<string, Socket[]> = new Map();

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

    this.queues.forEach((queue, mode) => {
      const index = queue.findIndex(s => s.id === client.id);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`🗑️ Jugador ${client.id} eliminado de la cola de espera de ${mode}`);
      }
    });

    this.server.emit('player_offline', {
      userId: client.id,
      reconnectWindow: 30
    });
  }


TypeScript

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: JoinQueueDto 
  ) {
    const { mode, nickname } = payload;
    console.log(`🔍 [STEP 1] Inicio join_queue. Nick: ${nickname}, Mode: ${mode}`);

    // --- PROTECCIÓN CONTRA CRASH (client.data) ---
    if (!client.data) {
        console.log("⚠️ [DEBUG] client.data era undefined. Inicializando...");
        client.data = {};
    }
    
    // Simulación de usuario
    if (!client.data.user) {
        console.log(`👤 [STEP 2] Asignando usuario temporal: ${nickname}`);
        client.data.user = { pNick: nickname || 'Anon' };
    }

    // 1. Obtener la cola
    console.log(`📂 [STEP 3] Buscando cola para modo: ${mode}`);
    let queue = this.queues.get(mode);
    
    if (!queue) {
      console.log(`✨ [STEP 3.1] Cola nueva creada.`);
      queue = [];
      this.queues.set(mode, queue);
    }
    
    console.log(`📊 [STEP 4] Estado de la cola actual: ${queue.length} jugadores esperando.`);

    // --- ESCENARIO 1: Hay alguien esperando (MATCH ENCONTRADO) ---
    if (queue.length > 0) {
      console.log(`🤝 [STEP 5] Intentando emparejar...`);
      
      const opponent = queue.shift(); 

      // Validación estricta
      if (!opponent) {
          console.error("❌ [ERROR] opponent era undefined tras shift().");
          return;
      }

      console.log(`🆚 [STEP 6] Oponente encontrado: ${opponent.id}`);

      // Evitar jugar contra uno mismo
      if (opponent.id === client.id) {
        console.log("⚠️ [WARN] El jugador intentó jugar contra sí mismo. Devolviendo a cola.");
        queue.push(client);
        return;
      }

      console.log(`⚔️ MATCH ENCONTRADO: ${client.id} vs ${opponent.id}`);

      try {
        console.log(`💽 [STEP 7] Consultando DB para modo: ${mode}`);
        const modeResult = await this.db.query.matchMode.findFirst({
          where: eq(schema.matchMode.mmodName, mode)
        });

        if (!modeResult) {
          console.error(`❌ Error: El modo '${mode}' no existe en DB.`);
          queue.unshift(opponent);
          return;
        }

        console.log(`📝 [STEP 8] Insertando partida en DB...`);
        const newMatch = await this.db.insert(schema.match).values({
          mModeFk: modeResult.mmodPk,
          mDate: sql`NOW()`,
        }).returning({ insertedId: schema.match.mPk });

        const matchId = newMatch[0].insertedId;
        const roomId = `match_${matchId}`;

        // Unir a sala
        console.log(`🚪 [STEP 9] Uniendo sockets a sala ${roomId}`);
        await client.join(roomId);    
        await opponent.join(roomId);   

        // --- CÁLCULO DE FÍSICA SINCRONIZADA ---
        // Generamos el vector AQUÍ para que sea idéntico para los dos
        const dirX = Math.random() < 0.5 ? -1 : 1;
        const dirY = Math.random() * 2 - 1;
        const leng = Math.sqrt(dirX * dirX + dirY * dirY);
        const ballInit = { x: dirX / leng, y: dirY / leng };
        // ---------------------------------------

        // Respuestas (Ahora incluyen ballInit)
        const responseP1: MatchFoundResponse = {
          roomId, matchId, side: 'left',
          opponent: { name: client.data.user.pNick, avatar: 'default.png' },
          ballInit: ballInit // <--- NUEVO
        };

        const responseP2: MatchFoundResponse = {
          roomId, matchId, side: 'right',
          opponent: { name: opponent.data.user.pNick, avatar: 'default.png' },
          ballInit: ballInit // <--- NUEVO
        };

        console.log(`🚀 [STEP 10] Enviando evento match_found a ambos.`);
        opponent.emit('match_found', responseP1);
        client.emit('match_found', responseP2);

      } catch (error) {
        console.error('❌ [CRITICAL ERROR] Fallo en la lógica de DB/Sala:', error);
        if (opponent) queue.unshift(opponent);
      }

    } 
    // --- ESCENARIO 2: No hay nadie, toca esperar ---
    else {
      console.log(`📥 [STEP 5b] Cola vacía. Añadiendo a ${nickname} a la espera.`);
      queue.push(client);
      console.log(`⏳ Jugador ${client.id} añadido a la cola.`);
      
      client.emit('waiting_for_match', { 
        message: 'Buscando oponente...',
        mode: mode 
      });
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

    const updateData: GameUpdateResponse = {
      playerId: client.id,
      move: payload.direction // Esto ahora coincide con la interfaz
    };

    // Reenviar movimiento al oponente (Broadcast a la sala, excluyendo al emisor)
    // client.to(payload.roomId).emit('game_update', {
    //   playerId: client.id,
    //   move: payload.direction
    // });
    client.to(payload.roomId).emit('game_update', updateData);
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

  @SubscribeMessage('update_score')
  handleScoreUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: { score: number[], ballDir: number }) {
      // Buscamos la sala del cliente
      // client.rooms es un Set. Contiene el socketId y el nombre de la sala (match_XX).
      const rooms = Array.from(client.rooms);
      const matchRoom = rooms.find(r => r.startsWith('match_'));

      if (matchRoom) {
          // Enviamos a la sala (excepto al que envía, o a todos, depende de la lógica)
          // Usamos .to(matchRoom) para que llegue a todos.
          // Player 2 recibirá esto y actualizará.
          // Player 1 también, pero como ya actualizó localmente, no pasa nada (o podemos filtrar).
          
          // Mejor: client.to(matchRoom).emit(...) para que SOLO le llegue al rival.
          client.to(matchRoom).emit('score_updated', payload);
      }
  }

    //   // --- AUXILIAR (Futuro uso si la fisica la hace el servidor) ---
//   emitScore(roomId: string, scorerId: string, newScore: [number, number]) {
//     const payload: ScoreUpdateResponse = {
//       score: newScore,
//       scorerId: scorerId
//     };
//     this.server.to(roomId).emit('score_update', payload);
//   }
}
