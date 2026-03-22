//Se encarga de escribir y leer en la base de datos

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, eq, or, and, asc } from 'drizzle-orm';

// ⚠️ AJUSTA ESTAS RUTAS SEGÚN TU PROYECTO
import { DRIZZLE } from '../database.module'; 
import * as schema from '../schema'; 
import { GameGateway } from '../game.gateway';

@Injectable()
export class ChatService {
  
  constructor(
      @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
      @Inject(forwardRef(() => GameGateway)) private readonly gateway: GameGateway,
  ) {}

  // 1. Guardar un mensaje nuevo
  async saveDirectMessage(senderId: number, receiverId: number, content: string) {
    const newMessage = await this.db.insert(schema.directMessage).values({
      senderId,
      receiverId,
      content,
      isRead: false
    }).returning(); // PostgresJS soporta .returning() nativamente

    return newMessage[0];
  }

  // 2. Obtener historial de conversación entre dos usuarios
  async getConversation(user1Id: number, user2Id: number) {
    // Usamos db.query para aprovechar las relaciones que definimos en relations.ts
    return await this.db.query.directMessage.findMany({
      where: or(
        // Mensajes enviados por User1 a User2
        and(
          eq(schema.directMessage.senderId, user1Id),
          eq(schema.directMessage.receiverId, user2Id)
        ),
        // Mensajes enviados por User2 a User1
        and(
          eq(schema.directMessage.senderId, user2Id),
          eq(schema.directMessage.receiverId, user1Id)
        )
      ),
      orderBy: [asc(schema.directMessage.createdAt)], // Orden cronológico (viejos arriba)
      with: {
        // Incluimos datos del remitente (para mostrar nombre/avatar en el front)
        sender: {
            columns: {
                pNick: true,
                pAvatarUrl: true// (descomenta si tienes avatar en Player)
            }
        }
      }
    });
  }

  // 3. MODIFICADO: Obtener SOLO amigos (Estado 2 = Aceptado)
  async getUsers(currentUserId: number) {
      
    const ACCEPTED_STATUS_ID = 2; // 2 = Aceptado, según tu configuración

    // Buscamos en la tabla 'player_friend'
    const friendshipRelations = await this.db.query.playerFriend.findMany({
        where: and(
            // Condición A: Que el status sea Aceptado (2)
            eq(schema.playerFriend.fStatusFk, ACCEPTED_STATUS_ID),
            // Condición B: Que YO sea parte de la amistad (f1 o f2)
            or(
                eq(schema.playerFriend.f1, currentUserId),
                eq(schema.playerFriend.f2, currentUserId)
            )
        ),
        // Traemos los datos completos de los jugadores implicados
        with: {
            player_f1: true, 
            player_f2: true  
        }
    });

  // 4. Extraer lista limpia de amigos
  const friendsRaw = friendshipRelations.map((rel: any) => {
    return rel.f1 === currentUserId ? rel.player_f2 : rel.player_f1;
  }).filter((f: any) => f !== null);

  // 5. Deduplicar
  const uniqueMap = new Map();
  friendsRaw.forEach((f: any) => {
      if (!uniqueMap.has(f.pPk)) uniqueMap.set(f.pPk, f);
  });
  const uniqueFriends = Array.from(uniqueMap.values());

  // 6. AGREGAR CONTADOR DE NO LEÍDOS A CADA AMIGO
    const friendsWithUnread = await Promise.all(uniqueFriends.map(async (friend: any) => {
          
      // Contamos mensajes donde: Sender = Amigo, Receiver = Yo, isRead = False
      const unreadCountResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.directMessage)
          .where(and(
              eq(schema.directMessage.senderId, friend.pPk),
              eq(schema.directMessage.receiverId, currentUserId),
              eq(schema.directMessage.isRead, false)
          ));

      // Preguntamos al Gateway si este usuario está conectado
      const isOnline = this.gateway.isUserOnline(Number(friend.pPk));
      
      // 👇👇👇 DEBUG CLAVE: Mira esto en "docker logs backend" 👇👇👇
      if (friend.pAvatarUrl || friend.avatarUrl) {
          //console.log(`✅ [AVATAR] Encontrado para ${friend.pNick}: ${friend.pAvatarUrl || friend.avatarUrl}`);
      } else {
          //console.log(`⚠️ [AVATAR] ${friend.pNick} (ID: ${friend.pPk}) no tiene avatar en la DB.`);
      }
      // 👆👆👆 FIN DEBUG 👆👆👆

      // C. Devolvemos el objeto completo    
      return {
          ...friend,
          // Drizzle devuelve count como string en un array, lo convertimos
          unread: Number(unreadCountResult[0].count),
          status: isOnline ? 'online' : 'offline',
          
          // 👇 ASIGNACIÓN ROBUSTA: Probamos varios nombres por si acaso
          avatar: friend.pAvatarUrl || friend.avatarUrl || friend.pAvatar || null,
          // Enviamos también avatarId por si el frontend lo prefiere
          avatarId: friend.pAvatarUrl || friend.avatarUrl || friend.pAvatar || null
      };   
    }));
  
    return friendsWithUnread;
  }

  // 🔥 7. NUEVO MÉTODO: MARCAR COMO LEÍDOS
  async markAsRead(senderId: number, receiverId: number) {
    //console.log(`🧹 [DB] Marcando como leídos mensajes de ${senderId} para ${receiverId}`);
    
    const result = await this.db.update(schema.directMessage)
        .set({ isRead: true })
        .where(and(
            eq(schema.directMessage.senderId, senderId),
            eq(schema.directMessage.receiverId, receiverId),
            eq(schema.directMessage.isRead, false)
        ))
        .returning(); // Para ver cuántos actualizó
    
    //console.log(`✅ [DB] Mensajes actualizados: ${result.length}`);
    return { success: true, count: result.length };
  }


}