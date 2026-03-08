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
import { eq, sql } from 'drizzle-orm'; 
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
    console.log("🚨🚨🚨 [GATEWAY] SOCKET SERVER INICIADO - INSTANCIA ÚNICA ID:", Math.random());
  }

  // --- CONEXIÓN / DESCONEXIÓN ---

  public isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  handleConnection(client: Socket) {
    //console.log(`✅ Cliente conectado: ${client.id}`);
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
    
    console.log(`📨 Notificación '${event}' enviada a User ${targetUserId}`);
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

        console.log(`🚀 [STEP 10] Enviando evento match_found a ambos.`);
        opponent.emit('match_found', responseP1);
        client.emit('match_found', responseP2);

      } catch (error) {
        console.error('❌ [CRITICAL ERROR] Fallo en la lógica de DB/Sala:', error);
        if (opponent) queue.unshift(opponent);
      }
    // --- ESCENARIO 2: No hay nadie, toca esperar ---
    } else {
      console.log(`📥 [STEP 5b] Cola vacía. Añadiendo a ${nickname} a la espera.`);
      queue.push(client);
      console.log(`⏳ Jugador ${client.id} añadido a la cola.`);
      
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
      console.log(`🚪 Jugador ${client.id} ha abandonado la sala ${roomId} a medias.`);
      
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

  private updateGamePhysics(state: GameState) {
    // 1. Save PREVIOUS position (Key to avoid tunnel effect)
    const prevX = state.ball.x;
    const prevY = state.ball.y;

    // 2. Move the ball
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // 3. Bounces on top/bottom walls
    if (state.ball.y <= 0 || state.ball.y >= 1) {
        state.ball.vy *= -1;
        // Position correction so it doesn't get stuck
        state.ball.y = state.ball.y <= 0 ? 0.001 : 0.999;
    }

    const paddleHalf = this.PADDLE_HEIGHT / 2;
    // We define where the "face" of the paddle is (impact zone)
    const PADDLE_MARGIN = 0.035; // The same value you were using in your tests

    // --- LEFT PADDLE COLLISION (P1) ---
    // We detect if the ball CROSSED the paddle line (it was on the right and now it's on the left)
    if (prevX >= PADDLE_MARGIN && state.ball.x <= PADDLE_MARGIN) {
        
        // Calculate at what exact Y point it crossed the line X = PADDLE_MARGIN
        // Linear interpolation formula
        const t = (PADDLE_MARGIN - prevX) / (state.ball.x - prevX);
        const intersectY = prevY + t * (state.ball.y - prevY);

        // Check if that Y point is inside the paddle (with a small error margin '0.01' for edges)
        if (intersectY >= state.paddles.left - paddleHalf - 0.01 && 
            intersectY <= state.paddles.left + paddleHalf + 0.01) {
            
            // COLLISION CONFIRMED!
            state.ball.x = PADDLE_MARGIN + 0.01; // Take the ball out
            state.ball.vx = Math.abs(state.ball.vx); // FForce right direction
            
            // Game logic
            state.stats.totalHits++;
            state.ball.speed *= this.SPEED_INCREMENT;
            this.adjustAngle(state, state.paddles.left);
        }
    }

    // ---  RIGHT PADDLE COLLISION (P2) ---
    // We detect if the ball CROSSED the line (it was on the left and now it's on the right)
    const RIGHT_PADDLE_X = 1 - PADDLE_MARGIN;
    
    if (prevX <= RIGHT_PADDLE_X && state.ball.x >= RIGHT_PADDLE_X) {
        
        const t = (RIGHT_PADDLE_X - prevX) / (state.ball.x - prevX);
        const intersectY = prevY + t * (state.ball.y - prevY);

        if (intersectY >= state.paddles.right - paddleHalf - 0.01 && 
            intersectY <= state.paddles.right + paddleHalf + 0.01) {
            
            state.ball.x = RIGHT_PADDLE_X - 0.01; // Take the ball out
            state.ball.vx = -Math.abs(state.ball.vx); // Force left direction
            
            state.stats.totalHits++;
            state.ball.speed *= this.SPEED_INCREMENT;
            this.adjustAngle(state, state.paddles.right);
        }
    }

  // GOAL DETECTION
    if (state.ball.x < -0.05) {
        state.score[1]++; // Point P2
        this.handleGoal(state);
    } else if (state.ball.x > 1.05) {
        state.score[0]++;  // Point P1
        this.handleGoal(state);
    }
  }

// Refactoring to not repeat code in goals
  private handleGoal(state: GameState) {
      this.server.to(state.roomId).emit('score_updated', { score: state.score });
      this.resetBall(state);
      this.checkWinner(state);
  }

  private checkWinner(state: GameState) {
      if (state.score[0] >= this.MAX_SCORE || state.score[1] >= this.MAX_SCORE) {
        this.server.to(state.roomId).emit('score_updated', { roomId: state.roomId, score: state.score });
        // 1. Get the REAL NICKNAME of the winner using the saved IDs


        // TRICK: Since we don't have the nicks handy in 'state' easily (only in DB),
        // we're going to send "Left" or "Right" and let the Frontend put the name.
        const winnerSide = state.score[0] >= this.MAX_SCORE ? "left" : "right";
        //Registration in the database before stopping the loop
        this.saveMatchToDb(state);
          
        // We call finish game logic
        this.stopGameLoop(state.roomId);
 

        // 3. We send who won (left or right)
        // DELAY TRICK: We wait 500ms before sending Game Over
        // This allows the Frontend to receive the score, React renders the 5,
        // the user sees it, and THEN the ending jumps.
        setTimeout(() => {
                this.server.to(state.roomId).emit('game_over', { roomId: state.roomId, winner: winnerSide });
                console.log("🏁 Evento game_over enviado.");
            }, 500); // 500 milliseconds (half a second)
      }
  }

  private resetBall(state: GameState) {
      state.ball.x = 0.5;
      state.ball.y = 0.5;
      state.ball.speed = this.INITIAL_SPEED;
      const dirX = Math.random() < 0.5 ? -1 : 1;
      const angle = (Math.random() * 2 - 1) * (Math.PI / 5); 
      state.ball.vx = dirX * Math.cos(angle) * state.ball.speed;
      state.ball.vy = Math.sin(angle) * state.ball.speed;
      // // Simplifiquemos el saque para probar
      // state.ball.vx = (Math.random() < 0.5 ? -1 : 1) * state.ball.speed;
      // state.ball.vy = 0;
  }

  private adjustAngle(state: GameState, paddleY: number) {
      const deltaY = state.ball.y - paddleY; 
      const normalizedDelta = deltaY / (this.PADDLE_HEIGHT / 2);
      const angle = normalizedDelta * (Math.PI / 4);
      const dirX = state.ball.vx > 0 ? 1 : -1;
      state.ball.vx = dirX * Math.cos(angle) * state.ball.speed;
      state.ball.vy = Math.sin(angle) * state.ball.speed;
  }

  // --- PADDLE MOVE (Juego en tiempo real) ---

@SubscribeMessage('paddle_move')
  handlePaddleMove(
      @ConnectedSocket() client: Socket, 
      @MessageBody() payload: PaddleMoveDto 
  ) {
    const game = this.games.get(payload.roomId);
    
    // 1. If the game doesn't exist, we do nothing.
    if (!game) return;

    // 2. Defensive validation: If 'y' doesn't come, we exit.
    // (Although the DTO helps, this avoids logical errors if the frontend fails)
    if (payload.y === undefined || payload.y === null) return;

    // 3. Sanitization (Clamp): Convert to number and force range 0.0 - 1.0
    let newY = Number(payload.y); 
    newY = Math.max(0, Math.min(1, newY)); 

    // 4. Direct assignment according to who the client is
    if (client.id === game.playerLeftId) {
        game.paddles.left = newY;
    } else if (client.id === game.playerRightId) {
        game.paddles.right = newY;
    }
  }
  // --- FINISH GAME (CON INSERT DB FINAL) ---

  @SubscribeMessage('finish_game')
  async handleFinishGame(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: FinishGameDto 
  ) {
    console.log(`🏁 Petición fin juego: ${payload.roomId} por ${payload.winnerId}`);
    
    // Recuperar estado antes de borrarlo
    const game = this.games.get(payload.roomId);
    if (!game) return;
    
    console.log(`🏳️ ABANDONO detectado en sala: ${payload.roomId} por usuario ${payload.winnerId}`);
    // GUARDAR EN BASE DE DATOS (Una sola vez)
    //await this.saveMatchToDb(game, payload.winnerId);
    await this.saveMatchToDb(game);
    
    // Detenemos bucle y limpiamos memoria
    this.stopGameLoop(payload.roomId); 

    // Notificar y limpiar
    this.server.to(payload.roomId).emit('game_over', { winner: payload.winnerId });
    
    const sockets = await this.server.in(payload.roomId).fetchSockets();
    for (const s of sockets) {
        s.leave(payload.roomId);
    }
    console.log(`🗑️ Sala ${payload.roomId} limpiada.`);
  }
    
  //MÉTODO INSCRIPCION EN LA BASE DE DATOS EXTRAÍDO CORRECTAMENTE
  //private async saveMatchToDb(state: GameState, winnerSide: string) {
  private async saveMatchToDb(state: GameState) {
    const durationMs = Date.now() - state.stats.startTime.getTime();
    
    // 1. Determine winner ID
    let winnerPk: number; 
    if (state.score[0] > state.score[1]) {
        winnerPk = state.playerLeftDbId;
    } else if (state.score[1] > state.score[0]) {
        winnerPk = state.playerRightDbId;
    } else {
        // CASE 2: Tie (Rare, possible if there was simultaneous disconnection)
        // Decision: If it's 0-0 we don't save. If there are points, fallback to Left.
        if (state.score[0] === 0 && state.score[1] === 0) {
            return;
        }
        winnerPk = state.playerLeftDbId; // Tie Fallback
    }

    // 2. Determine the Game Mode (ID)
    // According to your 01_data.sql: 1='1v1_local', 2='1v1_remote', 3='1v1_ia'
    // Since this Gateway is the remote websocket, we will assume it's REMOTE (ID 2)
    // If you have tournament logic, adjust this.
    const MODE_REMOTE_ID = 2; 

    try {
        // . Call to SQL function 'insert_full_match_result'
        await this.db.execute(sql`
            SELECT insert_full_match_result(
                ${MODE_REMOTE_ID}::smallint,        -- p_mode_id
                ${state.stats.startTime.toISOString()}::timestamp,-- p_date
                ${durationMs}::integer,             -- p_duration_ms
                ${winnerPk}::integer,               -- p_winner_id
                ${state.playerLeftDbId}::integer,   -- p_p1_id
                ${state.score[0]}::float,           -- p_score_p1
                ${state.playerRightDbId}::integer,  -- p_p2_id
                ${state.score[1]}::float,           -- p_score_p2
                ${state.stats.totalHits}::float     -- p_total_hits
            )
        `);
    } catch (error) {
      console.error("❌ Error saving game in DB", error);
    }
  }

  private stopGameLoop(roomId: string) {
      const game = this.games.get(roomId);
      // if (game && game.intervalId) {
      //     clearInterval(game.intervalId);
      //     this.games.delete(roomId);
      // }
      if (game) {
          // Si hay un bucle corriendo, lo paramos
          if (game.intervalId) {
              clearInterval(game.intervalId);
          }
          // Borramos SIEMPRE la sala de la memoria
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

    // B. Check if they are already in game (Optional, but recommended)
    // ... MISSING (Logic to see if targetId is already playing) ...

    // C. We send the invitation to the target
    // We include the senderId and senderName (if you have it in client.data or you look it up)
      this.server.to(targetSocketId).emit('incoming_game_invite', {
          fromUserId: senderId,
          fromUserName: client.data.user?.pNick || 'app.afriend', // Make sure you have the nick // or "A friend"
          mode: 'classic' // Or 'custom', if you implement modes
      });
  }

// 2. Accept Invitation
  @SubscribeMessage('accept_game_invite')
  async handleAcceptInvite(client: Socket, payload: { challengerId: number }) {
    // 1. Get IDs
      const acceptorDbId = client.data.userId; 
      const challengerDbId = Number(payload.challengerId);

      console.log(`🤝 [GATEWAY] Buscando datos reales para: ${challengerDbId} vs ${acceptorDbId}`);

      // 2. Variables for names (Default values)
      // Initializes to null: avoids error "undefined varaible"
      let p1Data: any = null;
      let p2Data: any = null;
      
      let challengerName = "Jugador 1";
      let acceptorName = "Jugador 2";

      // 🔥 3. DATABASE QUERY (THE REAL SOLUTION)
      // We use await to ensure we have the names before continuing
      try {
          // We look for the Challenger (P1)
          // NOTE: If `this.findPlayerById` returns the entire object from the database (including `pAvatarUrl`), this works.
          // Otherwise, you should change it to: `await this.db.query.player.findFirst({ where: eq(schema.player.pPk, challengerDbId) });`
          p1Data = await this.findPlayerById(challengerDbId);
          
          if (p1Data && p1Data.pNick) {
              challengerName = p1Data.pNick;
          }
          

          // We look for the Acceptor (P2)
          p2Data = await this.findPlayerById(acceptorDbId);
          
          if (p2Data && p2Data.pNick) {
              acceptorName = p2Data.pNick;
          }
      } catch (error) {
          console.error("❌ Error recuperando nombres/avatares de la DB:", error);
      }

    // 4. Validate rival's socket
      const challengerSocketId = this.userSockets.get(challengerDbId);
      if (!challengerSocketId) {
        client.emit('invite_error', { msg: "The challenger has disconnected." });
          return;
      }
      const challengerSocket = this.server.sockets.sockets.get(challengerSocketId);

    // 5. Create Room
      const roomId = `private_${challengerDbId}_${acceptorDbId}_${Date.now()}`;
      
      if (challengerSocket) challengerSocket.join(roomId);
      client.join(roomId);

      //6. Notify the Frontend (With the Names from the DB adn avatars)
      
      // //A) For the Challenger (P1 - Left) -> Su rival es P2 (Aceptador)
      this.server.to(challengerSocketId).emit('match_found', {
          roomId: roomId,
          side: 'left',
          opponent: { 
              id: acceptorDbId,
              name: acceptorName, 
              // Usamos pAvatarUrl si existe, si no null
              avatar: p2Data?.pAvatarUrl || null 
          }, 
          matchId: 0 
      });

      // B) For the Acceptor (P2 - Right) -> Su rival es P1 (Desafiante)
      this.server.to(client.id).emit('match_found', {
          roomId: roomId,
          side: 'right',
          opponent: { 
              id: challengerDbId,
              name: challengerName, 
              // Usamos pAvatarUrl si existe, si no null
              avatar: p1Data?.pAvatarUrl || null 
          },
          matchId: 0
      });

    // 7. Start Game
      this.startGameLoop(
          roomId,
          challengerSocketId,
          client.id,
          challengerDbId,
          acceptorDbId
      );
  }


}
