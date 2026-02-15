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

  //Mapa para gestionar colas por modo de juego (ej: '1v1_remote' -> [Socket])
  private queues: Map<string, Socket[]> = new Map();

  // ALMACÉN DE PARTIDAS ACTIVAS
  private games: Map<string, GameState> = new Map();

  // NUEVO: MAPA DE USUARIOS CONECTADOS (UserId -> SocketId)
  // Esto nos permite saber qué socket pertenece a qué usuario para enviarle notificaciones
  private userSockets = new Map<number, string>();

  // Constantes de física del servidor (Ajustables)
  private readonly SERVER_WIDTH = 1.0; // Normalizado
  private readonly SERVER_HEIGHT = 1.0; // Normalizado
  private readonly PADDLE_HEIGHT = 0.2; // 20% de la pantalla (ajusta a tu gusto)
  private readonly INITIAL_SPEED = 0.01; // Velocidad inicial por frame
  private readonly SPEED_INCREMENT = 1.02; // 5% más rápido cada golpe
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
    // NUEVO: LÓGICA DE IDENTIFICACIÓN DE USUARIO
    // El frontend nos envía ?userId=123 en la conexión
    const userId = client.handshake.query.userId;

    if (userId) {
        const idNum = parseInt(userId as string, 10);
        
        // 1. Guardamos en el mapa
        this.userSockets.set(idNum, client.id);
        
        // 2. Unimos al usuario a una sala con su propio nombre (útil para multitarjeta)
        client.join(`user_${idNum}`);
        
        // 3. Guardamos el ID en el objeto data del socket para usarlo luego
        client.data.userId = idNum;

        console.log(`✅ Cliente conectado: ${client.id} | Usuario ID: ${idNum}`);
        // NUEVO: AVISAR A TODOS QUE ESTE USUARIO ESTÁ ONLINE
        // (El frontend filtrará si le importa o no este usuario)
        this.server.emit('user_status', { userId: idNum, status: 'online' });

    } else {
        console.log(`⚠️ Cliente conectado sin UserID: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);

    // --- CORRECCIÓN DEL BUG DE "VISIBILIDAD UNILATERAL" ---
    if (client.data.userId) {
        const userId = client.data.userId;
        
        // 1. Verificamos si el usuario tiene un socket registrado
        const currentSocketId = this.userSockets.get(userId);

        // 2. IMPORTANTE: Solo borramos y notificamos si el socket que se va
        // es EL MISMO que tenemos registrado como activo.
        // Esto evita que una pestaña vieja cerrándose desconecte a la nueva.
        if (currentSocketId === client.id) {
            this.userSockets.delete(userId);
            console.log(`👋 Usuario ${userId} eliminado del registro online.`);
            this.server.emit('user_status', { userId: userId, status: 'offline' });
        } else {
            console.log(`ℹ️ Usuario ${userId} se desconectó (socket viejo), pero sigue conectado en otro socket.`);
        }
    }

    this.queues.forEach((queue, mode) => {
      const index = queue.findIndex(s => s.id === client.id);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`🗑️ Jugador ${client.id} eliminado de la cola de espera de ${mode}`);
      }
    });

    // Limpiar partida activa
    for (const [roomId, game] of this.games.entries()) {
        if (game.playerLeftId === client.id || game.playerRightId === client.id) {
             console.log(`⚠️ Jugador desconectado en partida ${roomId}. Terminando...`);
             this.stopGameLoop(roomId); 
             this.server.to(roomId).emit('opponent_disconnected');
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
        
        // Validar modo
        console.log(`💽 [STEP 7] Consultando DB para modo: ${mode}`);
        const modeResult = await this.db.query.matchMode.findFirst({
          where: eq(schema.matchMode.mmodName, mode)
        });

        if (!modeResult) {
          console.error(`❌ Error: El modo '${mode}' no existe en DB.`);
          queue.unshift(opponent);
          return;
        }

        // Obtener IDs de DB (necesarios para el Guardado Final)
        console.log(`📝 [STEP 8] Guardando datos para DB...`);
        const p1Db = await this.findPlayerByNick(client.data.user.pNick);
        const p2Db = await this.findPlayerByNick(opponent.data.user.pNick);

        if (!p1Db || !p2Db) {
            console.error("❌ No se encontraron los usuarios en DB");
            return;
        }
        // Generar Room ID temporal (NO insertamos en DB todavía)
        const roomId = `room_${uuidv4()}`; 
        
        // MatchId temporal (0) porque aún no existe en DB
        const tempMatchId = 0;

        // Unir a sala
        console.log(`🚪 [STEP 9] Uniendo sockets a sala ${roomId}`);
        await client.join(roomId);    
        await opponent.join(roomId);   

        // --- INICIAR EL BUCLE DE SERVIDOR ---
        this.startGameLoop(
            roomId, 
            opponent.id,  // El que esperaba va a la IZQUIERDA (Player 1)
            client.id,    // El que llega va a la DERECHA (Player 2)
            p2Db.pPk,     // Asegúrate que este DB ID corresponda al opponent (ajusta si es necesario)
            p1Db.pPk      // Asegúrate que este DB ID corresponda al client
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
      // INICIALIZACIÓN DE ESTADÍSTICAS
      stats: {
          totalHits: 0,
          maxRally: 0,
          startTime: new Date()
      }
    };

    this.resetBall(state);
    this.games.set(roomId, state);

    // CALCULAMOS LA HORA DE INICIO REAL (Ahora + 3500ms)
    // 3000ms de cuenta atrás + 500ms del cartel "GO!"
    const physicsStartTime = Date.now() + 3500;

  // Bucle a 60 FPS (aprox 16ms)
    const interval = setInterval(() => {
      // Protección Zombie: Si la sala se borró, parar.
      if (!this.games.has(roomId)) {
          clearInterval(interval);
          return;
      }

      // BLOQUEO TEMPORAL
      // Si aún no ha pasado el tiempo de espera, NO calculamos física.
      if (Date.now() < physicsStartTime) {
          // Opcional: Podríamos emitir posiciones estáticas para asegurar
          // que el cliente tenga la bola centrada, pero el cliente ya lo hace.
          return; 
      }

      this.updateGamePhysics(state);
      
      this.server.to(roomId).emit('game_update_physics', {
        ball: { x: state.ball.x, y: state.ball.y },
        score: state.score,
        paddles: { left: state.paddles.left, right: state.paddles.right }
      });

    }, 16);
    state.intervalId = interval;
  }

  private updateGamePhysics(state: GameState) {
    // 1. Guardar posición ANTERIOR (Clave para evitar efecto túnel)
    const prevX = state.ball.x;
    const prevY = state.ball.y;

    // 2. Mover la bola
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // 3. Rebotes en paredes superior/inferior
    if (state.ball.y <= 0 || state.ball.y >= 1) {
        state.ball.vy *= -1;
        // Corrección de posición para que no se quede pegada
        state.ball.y = state.ball.y <= 0 ? 0.001 : 0.999;
    }

    const paddleHalf = this.PADDLE_HEIGHT / 2;
    // Definimos dónde está la "cara" de la pala (zona de impacto)
    const PADDLE_MARGIN = 0.035; // El mismo valor que usabas en tus pruebas

    // --- COLISIÓN PALA IZQUIERDA (P1) ---
    // Detectamos si la bola CRUZÓ la línea de la pala (estaba a la derecha y ahora está a la izquierda)
    if (prevX >= PADDLE_MARGIN && state.ball.x <= PADDLE_MARGIN) {
        
        // Calcular en qué punto exacto de Y cruzó la línea X = PADDLE_MARGIN
        // Fórmula de interpolación lineal
        const t = (PADDLE_MARGIN - prevX) / (state.ball.x - prevX);
        const intersectY = prevY + t * (state.ball.y - prevY);

        // Comprobar si ese punto Y está dentro de la pala (con un pequeño margen de error '0.01' para bordes)
        if (intersectY >= state.paddles.left - paddleHalf - 0.01 && 
            intersectY <= state.paddles.left + paddleHalf + 0.01) {
            
            // ¡COLISIÓN CONFIRMADA!
            state.ball.x = PADDLE_MARGIN + 0.01; // Sacar la bola
            state.ball.vx = Math.abs(state.ball.vx); // Forzar dirección derecha
            
            // Lógica de juego
            state.stats.totalHits++;
            state.ball.speed *= this.SPEED_INCREMENT;
            this.adjustAngle(state, state.paddles.left);
        }
    }

    // --- COLISIÓN PALA DERECHA (P2) ---
    // Detectamos si la bola CRUZÓ la línea (estaba a la izquierda y ahora está a la derecha)
    const RIGHT_PADDLE_X = 1 - PADDLE_MARGIN;
    
    if (prevX <= RIGHT_PADDLE_X && state.ball.x >= RIGHT_PADDLE_X) {
        
        const t = (RIGHT_PADDLE_X - prevX) / (state.ball.x - prevX);
        const intersectY = prevY + t * (state.ball.y - prevY);

        if (intersectY >= state.paddles.right - paddleHalf - 0.01 && 
            intersectY <= state.paddles.right + paddleHalf + 0.01) {
            
            state.ball.x = RIGHT_PADDLE_X - 0.01; // Sacar la bola
            state.ball.vx = -Math.abs(state.ball.vx); // Forzar dirección izquierda
            
            state.stats.totalHits++;
            state.ball.speed *= this.SPEED_INCREMENT;
            this.adjustAngle(state, state.paddles.right);
        }
    }

  // DETECCIÓN DE GOLES
    if (state.ball.x < -0.05) {
        state.score[1]++; // Punto P2
        this.handleGoal(state);
    } else if (state.ball.x > 1.05) {
        state.score[0]++; // Punto P1
        this.handleGoal(state);
    }
  }

  // Refactorización para no repetir código en goles
  private handleGoal(state: GameState) {
      this.server.to(state.roomId).emit('score_updated', { score: state.score });
      this.resetBall(state);
      this.checkWinner(state);
  }

  private checkWinner(state: GameState) {
      if (state.score[0] >= this.MAX_SCORE || state.score[1] >= this.MAX_SCORE) {
          this.server.to(state.roomId).emit('score_updated', { score: state.score });
        // // 1. Obtener el NICKNAME real del ganador usando los IDs guardados
        //   const winnerNick = state.score[0] >= this.MAX_SCORE 
        //       ? (state.playerLeftId === state.playerLeftId ? "User_Left" : "Unknown") // Simplificación temporal, mejor usar DB
        //       : (state.playerRightId === state.playerRightId ? "User_Right" : "Unknown");

          // TRUCO: Como no tenemos los nicks a mano en 'state' fácil (solo en DB), 
          // vamos a enviar "Left" o "Right" y que el Frontend ponga el nombre.
          const winnerSide = state.score[0] >= this.MAX_SCORE ? "left" : "right";
          //Inscripcion en la base de datos antes de parar el loop
          //this.saveMatchToDb(state, winnerSide);
          this.saveMatchToDb(state);
          
          // Llamamos a finish game logic
          this.stopGameLoop(state.roomId);
 

          // 3. Enviamos quién ganó (left o right)
          // TRUCO DEL DELAY: Esperamos 500ms antes de mandar el Game Over
            // Esto permite que el Frontend reciba el score, React renderice el 5, 
            // el usuario lo vea, y LUEGO salte el final.
            setTimeout(() => {
                this.server.to(state.roomId).emit('game_over', { winner: winnerSide });
                console.log("🏁 Evento game_over enviado.");
            }, 500); // 500 milisegundos (medio segundo)
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
    
    // 1. Si la partida no existe, no hacemos nada.
    if (!game) return;

    // 2. Validación defensiva: Si 'y' no viene, salimos.
    // (Aunque el DTO ayuda, esto evita errores lógicos si el frontend falla)
    if (payload.y === undefined || payload.y === null) return;

    // 3. Sanitización (Clamp): Convertir a número y forzar rango 0.0 - 1.0
    let newY = Number(payload.y); 
    newY = Math.max(0, Math.min(1, newY)); 

    // 4. Asignación directa según quién sea el cliente
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
    console.log(`💾 Guardando partida en DB (Estructura Relacional)...`);

    const durationMs = Date.now() - state.stats.startTime.getTime();
    
    // 1. Determinar ID del ganador
    let winnerPk: number; 
    if (state.score[0] > state.score[1]) {
        winnerPk = state.playerLeftDbId;
    } else if (state.score[1] > state.score[0]) {
        winnerPk = state.playerRightDbId;
    } else {
        // CASO 2: Empate (Raro, posible si hubo desconexión simultánea)
        // Decisión: Si es 0-0 no guardamos. Si hay puntos, fallback al Left.
        if (state.score[0] === 0 && state.score[1] === 0) {
            console.log("⚠️ Partida terminada 0-0, no se guarda en historial.");
            return;
        }
        winnerPk = state.playerLeftDbId; // Fallback empate
    }

    // 2. Determinar el Modo de Juego (ID)
    // Según tu 01_data.sql: 1='1v1_local', 2='1v1_remote', 3='1v1_ia'
    // Como este Gateway es el websocket remoto, asumiremos que es REMOTE (ID 2)
    // Si tienes lógica de torneo, ajusta esto.
    const MODE_REMOTE_ID = 2; 

    try {
        // 3. Llamada a la función SQL 'insert_full_match_result'
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
        
        console.log("✅ Partida guardada correctamente en MATCH, COMPETITOR y METRICS.");
    } catch (error) {
        console.error("❌ Error guardando partida en DB:", error);
    }
  }

  private stopGameLoop(roomId: string) {
      const game = this.games.get(roomId);
      if (game && game.intervalId) {
          clearInterval(game.intervalId);
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

  // --- INVITACIONES DE JUEGO (PONG) ---

  // 1. Enviar Invitación
  @SubscribeMessage('send_game_invite')
  handleSendInvite(client: Socket, payload: { targetId: number }) {
      const senderId = client.data.userId; // O como obtengas el ID del remitente
      const targetId = Number(payload.targetId);

      console.log(`📨 [GATEWAY] Usuario ${senderId} invita a jugar a ${targetId}`);

      // A. Buscamos si el objetivo está conectado
      const targetSocketId = this.userSockets.get(targetId);

      if (!targetSocketId) {
          // Si no está, avisamos al remitente
          client.emit('invite_error', { msg: "El usuario no está conectado." });
          return;
      }

      // B. Comprobar si ya están en juego (Opcional, pero recomendado)
      // ... FALTA (Lógica para ver si targetId ya está jugando) ...

      // C. Enviamos la invitación al objetivo
      // Incluimos el senderId y senderName (si lo tienes en client.data o lo buscas)
      this.server.to(targetSocketId).emit('incoming_game_invite', {
          fromUserId: senderId,
          fromUserName: client.data.user?.pNick || "Un amigo", // Asegúrate de tener el nick
          mode: 'classic' // O 'custom', si implementas modos
      });
  }

  // 2. Aceptar Invitación
  @SubscribeMessage('accept_game_invite')
  async handleAcceptInvite(client: Socket, payload: { challengerId: number }) {
      // 1. Obtener IDs
      const acceptorDbId = client.data.userId; 
      const challengerDbId = Number(payload.challengerId);

      console.log(`🤝 [GATEWAY] Buscando datos reales para: ${challengerDbId} vs ${acceptorDbId}`);

      // 2. Variables (Ahora guardamos el OBJETO entero, no solo el nombre)
      // Inicializamos en null para evitar errores de "variable no definida"
      let p1Data: any = null;
      let p2Data: any = null;
      
      let challengerName = "Jugador 1";
      let acceptorName = "Jugador 2";

      // 🔥 3. CONSULTA A BASE DE DATOS
      try {
          // Buscamos al Desafiante (P1)
          // NOTA: Si this.findPlayerById devuelve el objeto completo de la DB (incluyendo pAvatarUrl), esto funciona.
          // Si no, deberías cambiarlo por: await this.db.query.player.findFirst({ where: eq(schema.player.pPk, challengerDbId) });
          p1Data = await this.findPlayerById(challengerDbId);
          
          if (p1Data && p1Data.pNick) {
              challengerName = p1Data.pNick;
          }

          // Buscamos al Aceptador (P2)
          p2Data = await this.findPlayerById(acceptorDbId);
          
          if (p2Data && p2Data.pNick) {
              acceptorName = p2Data.pNick;
          }
      } catch (error) {
          console.error("❌ Error recuperando nombres/avatares de la DB:", error);
      }

      console.log(`🔎 [MATCH] Nombres confirmados: ${challengerName} vs ${acceptorName}`);

      // 4. Validar socket del rival
      const challengerSocketId = this.userSockets.get(challengerDbId);
      if (!challengerSocketId) {
          client.emit('invite_error', { msg: "El desafiante se ha desconectado." });
          return;
      }
      const challengerSocket = this.server.sockets.sockets.get(challengerSocketId);

      // 5. Crear Sala
      const roomId = `private_${challengerDbId}_${acceptorDbId}_${Date.now()}`;
      
      if (challengerSocket) challengerSocket.join(roomId);
      client.join(roomId);

      // 6. Notificar al Frontend (Con Nombres y Avatares)
      
      // A) Para el Desafiante (P1 - Izquierda) -> Su rival es P2 (Aceptador)
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

      // B) Para el Aceptador (P2 - Derecha) -> Su rival es P1 (Desafiante)
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

      // 7. Iniciar Juego
      this.startGameLoop(
          roomId,
          challengerSocketId,
          client.id,
          challengerDbId,
          acceptorDbId
      );
  }


}
