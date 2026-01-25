//Se encarga de escribir y leer en la base de datos

import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, or, and, asc } from 'drizzle-orm';

// ⚠️ AJUSTA ESTAS RUTAS SEGÚN TU PROYECTO
import { DRIZZLE } from '../database.module'; 
import * as schema from '../schema'; 

@Injectable()
export class ChatService {
  
  constructor(
      @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>
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
                // pAvatar: true (descomenta si tienes avatar en Player)
            }
        }
      }
    });
  }
//   // 3. Obtener lista de usuarios para el chat (excluyendo al propio usuario)
// async getUsers(currentUserId: number) {
//     // Obtenemos todos los usuarios (id y nick)
//     const allUsers = await this.db.query.player.findMany({
//         columns: {
//             pPk: true,   // ID
//             pNick: true, // Nombre
//             // pAvatar: true, // Descomenta si tienes avatar
//         }
//     });

//     // Filtramos para no devolverme a mí mismo
//     return allUsers.filter(user => user.pPk !== currentUserId);
//   }
// }
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

  // Procesamos la lista: 
      // La relación contiene dos usuarios (yo y mi amigo). 
      // Esta lógica extrae solo al "otro".
      const myFriends = friendshipRelations.map((rel: any) => {
        if (rel.f1 === currentUserId) {
            return rel.player_f2; 
        } else {
            return rel.player_f1; 
        }
    });

    // Filtramos nulos por seguridad
    // 👇 AÑADIDO ': any' AQUÍ TAMBIÉN
    return myFriends.filter((friend: any) => friend !== null);
  }
}