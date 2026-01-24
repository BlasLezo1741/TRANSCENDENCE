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
}
