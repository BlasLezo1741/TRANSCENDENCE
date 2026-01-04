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
import { UsePipes, ValidationPipe } from '@nestjs/common';

// DTOs (Entrada)
import { JoinQueueDto } from './dto/join-queue.dto';
import { PaddleMoveDto } from './dto/paddle-move.dto';
import { FinishGameDto } from './dto/finish-game.dto';

// Interfaces (Salida)
import { MatchFoundResponse } from './dto/match-found.response';
import { GameUpdateResponse } from './dto/game-update.response';
import { ScoreUpdateResponse } from './dto/score-update.response';

//Conexion con la base de datos
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './match.entity';

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

//AÑADIMOS EL CONSTRUCTOR PARA INYECTAR LA DB
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
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
  async andleJoinQueue(
    @ConnectedSocket() client: Socket, 
    @MessageBody() payload: JoinQueueDto // Ahora usa el DTO
  ) {
    // Ahora el log imprimirá dinámicamente el modo validado
    console.log(`📢 [NUEVA PARTIDA] Usuario: ${payload.userId} | Modo: ${payload.mode}`);
  
    // --- LÓGICA DE PERSISTENCIA --- 
    try {
      const newMatch = this.matchRepository.create({
        mode: payload.mode
        // Aquí podrías añadir: date: new Date() si quieres ser explícito
      });
      await this.matchRepository.save(newMatch);
      console.log(`💾 Guardado en DB con ID: ${newMatch.id}`);
    } catch (error) {
      console.error('❌ Error al guardar partida:', error);
    }
    // ------------------------------

    const roomId = `room_${payload.mode}_${client.id}`;
    client.join(roomId);

// Usamos la interfaz de respuesta para cumplir el protocolo
    const response: MatchFoundResponse = {
      roomId,
      side: 'left',
      opponent: { name: 'Oponente Beta', avatar: 'default.png' }
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
