import { 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody, 
  OnGatewayInit     
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsePipes, ValidationPipe, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid'; //(o usar crypto.randomUUID en Node moderno)
// DTOs (Entrada)
import { JoinQueueDto } from './dto/join-queue.dto';
import { PaddleMoveDto } from './dto/paddle-move.dto';
import { FinishGameDto } from './dto/finish-game.dto';

// Interfaces (Salida)
import { MatchFoundResponse } from './dto/match-found.response';

// --- DRIZZLE & DB ---
import { DRIZZLE } from './database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema'; 
import { eq } from 'drizzle-orm'; 
// --------------------



// INTERFAZ DE ESTADO DEL JUEGO (Memoria del Servidor)
interface GameState {
  roomId: string;
  // Guardamos las PKs de usuarios para el INSERT final
  playerLeftDbId: number; 
  playerRightDbId: number;
  // IDs de socket (para desconexión)
  playerLeftId: string;
  playerRightId: string;
  ball: {
    x: number;      // Posición X (0.0 a 1.0)
    y: number;      // Posición Y (0.0 a 1.0)
    vx: number;     // Velocidad X
    vy: number;     // Velocidad Y
    speed: number;  // Velocidad escalar
  };
  paddles: {
    left: number;   // Y del jugador izq (0.0 a 1.0)
    right: number;  // Y del jugador der (0.0 a 1.0)
  };
  score: [number, number]; // [Izquierda, Derecha]
// NUEVAS ESTADÍSTICAS
  stats: {
      totalHits: number;      // Toques totales
      maxRally: number;       // Peloteo más largo
      startTime: Date;        // Para calcular duración exacta
  };
  intervalId?: NodeJS.Timeout; // El ID del bucle para poder pararlo
}

@UsePipes(new ValidationPipe({ whitelist: true }))
@WebSocketGateway({
  cors: {
    //origin: true,
    origin: '*',
    //methods: ["GET", "POST"],
    //credentials: true
  },
  //transports: ['polling', 'websocket']
  transports: ['websocket']
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  //Map to manage queues by game mode (e.g.: '1v1_remote' -> [Socket])
  private queues: Map<string, Socket[]> = new Map();

  // ACTIVE GAMES STORAGE
  private games: Map<string, GameState> = new Map();

  // NEW: CONNECTED USERS MAP (UserId -> SocketId)
  // This allows us to know which socket belongs to which user to send them notifications
  private userSockets = new Map<number, string>();

  // Server physics constants (Adjustable)
  private readonly SERVER_WIDTH = 1.0; // Normalized
  private readonly SERVER_HEIGHT = 1.0; // Normalized
  private readonly PADDLE_HEIGHT = 0.2; // 20% of the screen (adjust to your liking)
  private readonly INITIAL_SPEED = 0.01; // Initial speed per frame
  private readonly SPEED_INCREMENT = 1.02; // 5% faster each hit
  private readonly MAX_SCORE = 5;

  constructor(
    @Inject(DRIZZLE) 
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}
  
  //Metodo de control
  afterInit(server: Server) {
    //console.log("🚨🚨🚨 [GATEWAY] SOCKET SERVER INICIADO - INSTANCIA ÚNICA ID:", Math.random());
  }

  // --- CONEXIÓN / DESCONEXIÓN ---

  public isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  handleConnection(client: Socket) {
    ////console.log(`✅ Cliente conectado: ${client.id}`);
    // NEW: USER IDENTIFICATION LOGIC
    // The frontend sends us ?userId=123 in the connection 
    const userId = client.handshake.query.userId;

    if (userId) {
        const idNum = parseInt(userId as string, 10);
        
        // 1. We save it in the map
        this.userSockets.set(idNum, client.id);
        
        // 2. We join the user to a room with their own name (Useful for multi-tab)
        client.join(`user_${idNum}`);
        
        // 3. We save the ID in the socket's data object to use it later
        client.data.userId = idNum;

        // NEW: NOTIFY EVERYONE THAT THIS USER IS ONLINE
        // (The frontend will filter whether this user matters to them or not) 
        this.server.emit('user_status', { userId: idNum, status: 'online' });

    } else {

    }
  }

  handleDisconnect(client: Socket) {

    // --- FIX FOR "UNILATERAL VISIBILITY" BUG ---
    if (client.data.userId) {
        const userId = client.data.userId;
        
        // 1. We verify if the user has a registered socket
        const currentSocketId = this.userSockets.get(userId);

        // 2. IMPORTANT: We only delete and notify if the socket that's leaving
        // is THE SAME one we have registered as active. 
        // This prevents an old tab closing from disconnecting the new one.
        if (currentSocketId === client.id) {
            this.userSockets.delete(userId);
            this.server.emit('user_status', { userId: userId, status: 'offline' });
        } else {
 
        }
    }

    this.queues.forEach((queue, mode) => {
      const index = queue.findIndex(s => s.id === client.id);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    });

    // Clean up active game 
    for (const [roomId, game] of this.games.entries()) {
        if (game.playerLeftId === client.id || game.playerRightId === client.id) {

            // LÓGICA DE ABANDONO POR CAÍDA (Victoria 5-0)
             if (client.id === game.playerLeftId) {
                 game.score = [0, 5];
             } else if (client.id === game.playerRightId) {
                 game.score = [5, 0];
             }
             
            // Guardamos en la base de datos el abandono
            this.saveMatchToDb(game);
            // Detenemos bucle y avisamos al que se queda
            this.stopGameLoop(roomId); 
            this.server.to(roomId).emit('opponent_disconnected', { roomId: roomId });
        }
    }
  }

  // NUEVO: MÉTODO PÚBLICO PARA ENVIAR NOTIFICACIONES
  // Este método será llamado desde FriendsService (u otros servicios)
  public sendNotification(targetUserId: number, event: string, payload: any) {

    // Usar la sala que creamos en handleConnection
    // Esto asegura que si tiene 2 pestañas abiertas, le llegue a las dos.
    this.server.to(`user_${targetUserId}`).emit(event, payload);
    
    //console.log(`📨 Notificación '${event}' enviada a User ${targetUserId}`);
  }

  // --- JOIN QUEUE (MATCHMAKING) ---

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: JoinQueueDto 
  ) {
    const { mode, nickname } = payload;
    // English: Starting join_queue

    //  --- CRASH PROTECTION (client.data) ---
    if (!client.data) {
        client.data = {};
    }
    
    // User simulation
    if (!client.data.user) {
        client.data.user = { pNick: nickname || 'Anon' };
    }

    // 1. Get the queue
    let queue = this.queues.get(mode);
    
    if (!queue) {
      queue = [];
      this.queues.set(mode, queue);
    }
    
    // SCENARIO 1: Someone is waiting (MATCH FOUND) ---
    if (queue.length > 0) {    
      const opponent = queue.shift(); 

      // Strict validation
      if (!opponent) {
          return;
      }

    // Avoid playing against yourself
      if (opponent.id === client.id) {
        queue.push(client);
        return;
      }

      try {
        
      // Validate mode
        const modeResult = await this.db.query.matchMode.findFirst({
          where: eq(schema.matchMode.mmodName, mode)
        });

        if (!modeResult) {
          queue.unshift(opponent);
          return;
        }

      // Get DB IDs (necessary for Final Save)
        const p1Db = await this.findPlayerByNick(client.data.user.pNick);
        const p2Db = await this.findPlayerByNick(opponent.data.user.pNick);

        if (!p1Db || !p2Db) {
            return;
        }
      // Generate temporary Room ID (we do NOT insert in DB yet)
        const roomId = `room_${uuidv4()}`; 
        
      // Temporary MatchId (0) because it doesn't exist in DB yet
        const tempMatchId = 0;

      // Join room
        await client.join(roomId);    
        await opponent.join(roomId);   

      // --- START SERVER LOOP ---
        this.startGameLoop(
            roomId, 
            opponent.id,  // The one who was waiting goes to the LEFT (Player 1)
            client.id,    // The one who arrives goes to the RIGHT (Player 2)
            p2Db.pPk,     // Make sure this DB ID corresponds to the opponent (adjust if necessary)
            p1Db.pPk      // Make sure this DB ID corresponds to the client
        );
        const responseP1: MatchFoundResponse = {
          roomId,
          matchId: tempMatchId,
          side: 'left',
          // CORRECCIÓN: El rival de P1 es P2 (client)
          opponent: { id: p1Db.pPk, name: client.data.user.pNick, avatar: p1Db.pAvatarUrl },
          ballInit: { x: 0.5, y: 0.5 } 
        };

        const responseP2: MatchFoundResponse = {
          roomId,
          matchId: tempMatchId,
          side: 'right',
          // CORRECCIÓN: El rival de P2 es P1 (opponent)
          opponent: { id: p2Db.pPk, name: opponent.data.user.pNick, avatar: p2Db.pAvatarUrl }, 
          ballInit: { x: 0.5, y: 0.5 }
        };

        //console.log(`🚀 [STEP 10] Enviando evento match_found a ambos.`);
        opponent.emit('match_found', responseP1);
        client.emit('match_found', responseP2);

      } catch (error) {
        console.error('❌ [CRITICAL ERROR] Fallo en la lógica de DB/Sala:', error);
        if (opponent) queue.unshift(opponent);
      }
    // --- ESCENARIO 2: No hay nadie, toca esperar ---
    } else {
      //console.log(`📥 [STEP 5b] Cola vacía. Añadiendo a ${nickname} a la espera.`);
      queue.push(client);
      //console.log(`⏳ Jugador ${client.id} añadido a la cola.`);
      
      client.emit('waiting_for_match', { 
        message: 'Buscando oponente...',
        mode: mode 
      });
    }
  }

 // --- ABANDONO DE PARTIDA (BOTÓN VOLVER) ---
  @SubscribeMessage('leave_game')
  handleLeaveGame(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: { roomId: string }
  ) {
    const roomId = payload.roomId;
    const game = this.games.get(roomId);

    if (game) {
      //console.log(`🚪 Jugador ${client.id} ha abandonado la sala ${roomId} a medias.`);
      
      // LÓGICA DE ABANDONO (Victoria 5-0)
      if (client.id === game.playerLeftId) {
          game.score = [0, 5]; // Abandona izquierda, derecha gana
      } else if (client.id === game.playerRightId) {
          game.score = [5, 0]; // Abandona derecha, izquierda gana
      }
      
      // Guardamos el resultado de abandono en la base de datos
      this.saveMatchToDb(game);


      // 1. Detenemos el bucle de la partida para que deje de consumir recursos
      this.stopGameLoop(roomId);

      // 2. Avisamos al rival de que se ha quedado solo (¡INCLUYENDO EL ROOM ID!)
      this.server.to(roomId).emit('opponent_disconnected', { roomId: roomId });

      // 3. Sacamos al socket de la sala para que no reciba más basura
      client.leave(roomId);
    }
  } 

// --- GAME LOOP & PHYSICS ---

  private startGameLoop(roomId: string, pLeftId: string, pRightId: string, pLeftDb: number, pRightDb: number) {
    const state: GameState = {
      roomId,
      playerLeftId: pLeftId,
      playerRightId: pRightId,
      playerLeftDbId: pLeftDb,
      playerRightDbId: pRightDb,
      ball: { x: 0.5, y: 0.5, vx: 0, vy: 0, speed: this.INITIAL_SPEED },
      paddles: { left: 0.5, right: 0.5 },
      score: [0, 0],
      // STATISTICS INITIALIZATION
      stats: {
          totalHits: 0,
          maxRally: 0,
          startTime: new Date()
      }
    };

    this.resetBall(state);
    this.games.set(roomId, state);

    // WE CALCULATE THE REAL START TIME (Now + 3500ms)
    // 3000ms countdown + 500ms of "GO!" sign
    const physicsStartTime = Date.now() + 3500;

    // Loop at 60 FPS (approx 16ms)
    const interval = setInterval(() => {
      // Zombie Protection: If the room was deleted, stop.
      if (!this.games.has(roomId)) {
          clearInterval(interval);
          return;
      }

      // TEMPORARY BLOCK
      // If the waiting time hasn't passed yet, we do NOT calculate physics.
      if (Date.now() < physicsStartTime) {
          // Optional: We could emit static positions to ensure
          // that the client has the ball centered, but the client already does this.
          return; 
      }

      this.updateGamePhysics(state);
      
      this.server.to(roomId).emit('game_update_physics', {
        roomId: roomId,
        ball: { x: state.ball.x, y: state.ball.y },
        score: state.score,
        paddles: { left: state.paddles.left, right: state.paddles.right }
      });

    }, 16);

    state.intervalId = interval;
  }

  private resetBall(state: GameState) {
    state.ball.x = 0.5;
    state.ball.y = 0.5;
    state.ball.speed = this.INITIAL_SPEED;

    const angle = (Math.random() * Math.PI) / 2 - Math.PI / 4;
    const direction = Math.random() > 0.5 ? 1 : -1;
    state.ball.vx = Math.cos(angle) * state.ball.speed * direction;
    state.ball.vy = Math.sin(angle) * state.ball.speed;
  }

  private updateGamePhysics(state: GameState) {
    const ball = state.ball;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0 || ball.y >= this.SERVER_HEIGHT) {
      ball.vy *= -1;
      ball.y = Math.max(0, Math.min(this.SERVER_HEIGHT, ball.y));
    }

    const paddleWidth = 0.02;
    const halfPaddle = this.PADDLE_HEIGHT / 2;

    if (
      ball.vx < 0 &&
      ball.x <= paddleWidth &&
      ball.y >= state.paddles.left - halfPaddle &&
      ball.y <= state.paddles.left + halfPaddle
    ) {
      ball.vx *= -1;
      ball.x = paddleWidth;
      ball.speed *= this.SPEED_INCREMENT;

      state.stats.totalHits++;
    }

    if (
      ball.vx > 0 &&
      ball.x >= this.SERVER_WIDTH - paddleWidth &&
      ball.y >= state.paddles.right - halfPaddle &&
      ball.y <= state.paddles.right + halfPaddle
    ) {
      ball.vx *= -1;
      ball.x = this.SERVER_WIDTH - paddleWidth;
      ball.speed *= this.SPEED_INCREMENT;

      state.stats.totalHits++;
    }

    if (ball.x < 0) {
      state.score[1]++;
      this.resetBall(state);
      this.checkWinCondition(state);
    } else if (ball.x > this.SERVER_WIDTH) {
      state.score[0]++;
      this.resetBall(state);
      this.checkWinCondition(state);
    }
  }

  private checkWinCondition(state: GameState) {
    if (state.score[0] >= this.MAX_SCORE || state.score[1] >= this.MAX_SCORE) {
      this.server.to(state.roomId).emit('game_over', {
        roomId: state.roomId,
        score: state.score,
      });

      this.saveMatchToDb(state);
      this.stopGameLoop(state.roomId);
    }
  }

  @SubscribeMessage('paddle_move')
  handlePaddleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PaddleMoveDto
  ) {
    const { roomId, y } = payload;
    const game = this.games.get(roomId);

    if (!game) return;

    // ✅ FIX: y is number | undefined in PaddleMoveDto — guard before assignment
    if (y === undefined) return;

    if (client.id === game.playerLeftId) {
      game.paddles.left = y;
    } else if (client.id === game.playerRightId) {
      game.paddles.right = y;
    }
  }

  @SubscribeMessage('finish_game')
  async handleFinishGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: FinishGameDto
  ) {
    const { roomId } = payload;
    this.stopGameLoop(roomId);
  }

  private async saveMatchToDb(game: GameState) {
    try {
      const endTime = new Date();
      const durationMs = endTime.getTime() - game.stats.startTime.getTime();
      const durationSec = Math.floor(durationMs / 1000);

      const winnerId = game.score[0] > game.score[1] ? game.playerLeftDbId : game.playerRightDbId;

      const modeResult = await this.db.query.matchMode.findFirst({
        where: eq(schema.matchMode.mmodName, '1v1_remote')
      });
      if (!modeResult) return;

      // Insert the match row.
      // - mDate:     timestamp with mode:'string' → pass ISO string
      // - mDuration: PostgreSQL interval type    → pass interval literal e.g. '120 seconds'
      // - mWinnerFk: winner's player PK
      // - mModeFk:   match mode FK (smallint) — mmodPk is smallint so cast is safe
      const [newMatch] = await this.db.insert(schema.match).values({
        mWinnerFk: winnerId,
        mModeFk:   modeResult.mmodPk,
        mDate:     endTime.toISOString(),
        mDuration: `${durationSec} seconds`,
      }).returning();

      if (!newMatch) return;

      // Register both players as competitors for this match.
      // schema.competitor has: mcMatchFk (integer), mcPlayerFk (integer).
      // Primary key is (mcPlayerFk, mcMatchFk) — no score column exists in the schema.
      // Scores are stored separately via competitormetric if needed.
      await this.db.insert(schema.competitor).values([
        { mcMatchFk: newMatch.mPk, mcPlayerFk: game.playerLeftDbId },
        { mcMatchFk: newMatch.mPk, mcPlayerFk: game.playerRightDbId },
      ]);

      // The player table has no win/loss/points counters.
      // Stats are tracked relationally through the match + competitor + competitormetric tables.
      // If you want to store per-player scores for this match, insert rows into
      // schema.competitormetric with the appropriate metric FK and value.
      // Example (replace SCORE_METRIC_PK with the real metric PK from your metric table):
      //
      // const SCORE_METRIC_PK = 1; // TODO: replace with real metric PK
      // await this.db.insert(schema.competitormetric).values([
      //   { mcmMatchFk: newMatch.mPk, mcmPlayerFk: game.playerLeftDbId,  mcmMetricFk: SCORE_METRIC_PK, mcmValue: game.score[0] },
      //   { mcmMatchFk: newMatch.mPk, mcmPlayerFk: game.playerRightDbId, mcmMetricFk: SCORE_METRIC_PK, mcmValue: game.score[1] },
      // ]);

    } catch (err) {
      console.error('❌ Error saving match to DB:', err);
    }
  }

  private stopGameLoop(roomId: string) {
      const game = this.games.get(roomId);
      if (game) {
          if (game.intervalId) {
              clearInterval(game.intervalId);
          }
          this.games.delete(roomId);
      }
  }

  // HELPER NECESARIO
  private async findPlayerByNick(nickname: string) {
      return await this.db.query.player.findFirst({
          where: eq(schema.player.pNick, nickname)
      });
  }

  // Helper para buscar por ID (Vital para invitaciones)
  private async findPlayerById(id: number) {
      return await this.db.query.player.findFirst({
          where: eq(schema.player.pPk, id) 
      });
  }

// --- GAME INVITATIONS (PONG) ---

// 1. Send Invitation
  @SubscribeMessage('send_game_invite')
  handleSendInvite(client: Socket, payload: { targetId: number }) {
      const senderId = client.data.userId; // Or however you get the sender's ID
      const targetId = Number(payload.targetId);


    // A. We look if the target is connected
      const targetSocketId = this.userSockets.get(targetId);

      if (!targetSocketId) {
        // If they're not, we notify the sender
        client.emit('invite_error', { msg: "The user is not connected." });
          return;
      }

      // B. Check if they are already in a REMOTE game
      for (const game of this.games.values()) {
          if (game.playerLeftDbId === targetId || game.playerRightDbId === targetId) {
              client.emit('invite_error', { msg: "The user is currently in a match." });
              return;
          }
      }

    // C. We send the invitation to the target
    // We include the senderId and senderName (if you have it in client.data or you look it up)
      this.server.to(targetSocketId).emit('incoming_game_invite', {
          fromUserId: senderId,
          fromUserName: client.data.user?.pNick || 'app.afriend', // Make sure you have the nick // or "A friend"
          mode: 'classic' // Or 'custom', if you implement modes
      });
  }

  @SubscribeMessage('decline_game_invite')
  handleDeclineInvite(@MessageBody() payload: { challengerId: number, reason?: string }) {
    const challengerDbId = Number(payload.challengerId);
    const challengerSocketId = this.userSockets.get(challengerDbId);

    if (challengerSocketId) {
        // ✅ CHANGED: Fixed typo 'game.reject' → 'game.rejected' to match the translation key
        const msg = payload.reason === 'busy' 
            ? 'game.busy' 
            : 'game.rejected';
        this.server.to(challengerSocketId).emit('invite_error', { msg });
    }
  }

// 2. Accept Invitation
  @SubscribeMessage('accept_game_invite')
  async handleAcceptInvite(client: Socket, payload: { challengerId: number }) {
      
      const acceptorDbId = client.data.userId; 
      const challengerDbId = Number(payload.challengerId);

      // 1. Validar que el Retador sigue conectado (Hacerlo lo primero es la mejor lógica)
      const challengerSocketId = this.userSockets.get(challengerDbId);
      if (!challengerSocketId) {
          client.emit('invite_error', { msg: "The challenger has disconnected." });
          return;
      }
      const challengerSocket = this.server.sockets.sockets.get(challengerSocketId);

      // 2. RECUPERAR NOMBRES Y AVATARES DE LA DB (La magia que faltaba)
      let acceptorName = "Jugador 2";
      let challengerName = "Jugador 1";
      let acceptorAvatar: string | null = null;
      let challengerAvatar: string | null = null;

      try {
          const p1Data = await this.findPlayerById(challengerDbId);
          if (p1Data && p1Data.pNick) {
              challengerName = p1Data.pNick;
              challengerAvatar = p1Data.pAvatarUrl || null;
          }

          const p2Data = await this.findPlayerById(acceptorDbId);
          if (p2Data && p2Data.pNick) {
              acceptorName = p2Data.pNick;
              acceptorAvatar = p2Data.pAvatarUrl || null;
          }
      } catch (error) {
          console.error("❌ Error recuperando nombres/avatares de la DB:", error);
      }

      // 3. Crear Sala Privada y meter a ambos
      const roomId = `private_${challengerDbId}_${acceptorDbId}_${Date.now()}`;
      if (challengerSocket) challengerSocket.join(roomId);
      client.join(roomId);

      // 4. Avisar al Retador (P1 - Izquierda) -> Su rival es P2 (Aceptador)
      this.server.to(challengerSocketId).emit('match_found', {
          roomId: roomId,
          side: 'left',
          opponent: { 
              id: acceptorDbId, 
              name: acceptorName, 
              avatar: acceptorAvatar 
          }, 
          matchId: 0 
      });

      // 5. Avisar al que Acepta (P2 - Derecha) -> Su rival es P1 (Retador)
      this.server.to(client.id).emit('match_found', {
          roomId: roomId,
          side: 'right',
          opponent: { 
              id: challengerDbId, 
              name: challengerName, 
              avatar: challengerAvatar 
          },
          matchId: 0
      });

      // 6. Iniciar Motor Físico
      this.startGameLoop(roomId, challengerSocketId, client.id, challengerDbId, acceptorDbId);
  }

}