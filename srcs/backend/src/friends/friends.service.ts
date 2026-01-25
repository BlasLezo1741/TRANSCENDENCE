import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module'; // Ajusta la ruta a tu módulo de DB
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';
import { sql, eq } from 'drizzle-orm';
import { GameGateway } from '../game.gateway';

@Injectable()
export class FriendsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
        // IMPORTANTE: Inyectar el Gateway en el constructor
        private readonly gateway: GameGateway,
    ) {}

    // IDs basados en tu insert SQL (1=Pending, 2=Accepted, 3=Blocked)
    private readonly STATUS_PENDING = 1;
    private readonly STATUS_ACCEPTED = 2;
    private readonly STATUS_BLOCKED = 3;

    // 1. Enviar Solicitud (Yo -> Tú : Pendiente)
    async sendRequest(userId: number, targetId: number) {
        if (userId === targetId) return { ok: false, msg: "No puedes agregarte a ti mismo" };
        
        console.log(`🔄 [SERVICE] Procesando: ${userId} -> ${targetId}`);

        try {
            // 1. Limpieza de zombis
            await this.db.execute(sql`
                DELETE FROM PLAYER_FRIEND 
                WHERE (f_1 = ${userId} AND f_2 = ${targetId}) 
                   OR (f_1 = ${targetId} AND f_2 = ${userId})
            `);

            // 2. Insertar nueva
            await this.db.insert(schema.playerFriend).values({
                f1: userId,
                f2: targetId,
                fStatusFk: this.STATUS_PENDING
            });

            // 3. Notificar
            this.gateway.sendNotification(targetId, 'friend_request', { 
                from: userId,
                msg: "Tienes una nueva solicitud" 
            });

            return { ok: true, msg: "Solicitud enviada" };
        } catch (error) {
            console.error("💥 Error SQL en sendRequest:", error);
            return { ok: false, msg: "Error en base de datos" };
        }
    }

    // 2. Aceptar Solicitud (Yo -> Tú : Aceptado)
    // Nota: Insertamos un nuevo registro con fecha actual. Tu función SQL cogerá este como el válido.
    async acceptRequest(userId: number, targetId: number) {
        // BORRAR la solicitud pendiente (y cualquier historia previa)
        // Así evitamos que getPendingRequests siga encontrando la fila vieja
        await this.db.execute(sql`
            DELETE FROM PLAYER_FRIEND 
            WHERE (f_1 = ${userId} AND f_2 = ${targetId}) 
               OR (f_1 = ${targetId} AND f_2 = ${userId})
        `);
        
        await this.db.insert(schema.playerFriend).values({
            f1: userId,
            f2: targetId,
            fStatusFk: this.STATUS_ACCEPTED
        });
        // NOTIFICACIÓN DE ACEPTACIÓN
        // Esto es lo que le dice a User 1 "¡Eh! Ya somos amigos, recarga tu lista"
        console.log(`📤 Enviando notificación 'friend_accepted' a User ${targetId}`);
        
        this.gateway.sendNotification(targetId, 'friend_accepted', {
            friendId: userId,
            msg: "Tu solicitud ha sido aceptada"
        });

        // 🔔 NOTIFICACIÓN 2 (NUEVA): Al que acepta (User 2 - Tú mismo)
        // Esto obliga a TU ChatSidebar a recargar la lista inmediatamente
        this.gateway.sendNotification(userId, 'friend_accepted', {
            friendId: targetId,
            msg: "Has aceptado la solicitud"
        });

        return { ok: true, msg: "Solicitud aceptada" };
    }

    // 3. Bloquear Usuario (Yo -> Tú : Bloqueado)
    async blockUser(userId: number, targetId: number) {
        await this.db.insert(schema.playerFriend).values({
            f1: userId,
            f2: targetId,
            fStatusFk: this.STATUS_BLOCKED
        });
        return { ok: true, msg: "Usuario bloqueado" };
    }

    // 4. Obtener Lista de Amigos (VERSIÓN DEFINITIVA: Igual que el Chat)
    async getFriends(userId: number) {
        
        console.log(`🔍 [FRIENDS] Buscando amigos para ID: ${userId} (Lógica directa)`);

        // Usamos STATUS_ACCEPTED que definiste arriba (valor 2)
        // Nota: Asegúrate de que this.STATUS_ACCEPTED vale 2
        
        const result = await this.db.execute(sql`
            SELECT 
                p.p_pk as friend_id, 
                p.p_nick as friend_nick,
                -- Traemos el nombre del idioma (si existe)
                l.lang_name as friend_lang,
                pf.f_date as friendship_since
            FROM PLAYER_FRIEND pf
            -- 1. Unimos con la tabla PLAYER para sacar el nombre del amigo
            JOIN PLAYER p ON p.p_pk = (
                CASE 
                    WHEN pf.f_1 = ${userId} THEN pf.f_2 
                    ELSE pf.f_1 
                END
            )
            -- 2. Unimos con LANGUAGE para sacar el idioma (Left join por si es nulo)
            LEFT JOIN P_LANGUAGE l ON l.lang_pk = p.p_lang
            
            -- 3. FILTRO SENCILLO (Igual que el Chat)
            WHERE (pf.f_1 = ${userId} OR pf.f_2 = ${userId}) 
            AND pf.f_status_fk = ${this.STATUS_ACCEPTED}
        `);

        // Enriquecemos con estado Online del Gateway
        const enrichedResult = result.map((friend: any) => ({
            id: friend.friend_id,             
            friend_nick: friend.friend_nick,
            friend_lang: friend.friend_lang || 'Unknown', // Fallback por si no tiene idioma
            friendship_since: friend.friendship_since,
            status: this.gateway.isUserOnline(Number(friend.friend_id)) ? 'online' : 'offline'
        }));

        console.log(`✅ [FRIENDS] Encontrados ${enrichedResult.length} amigos.`);
        return enrichedResult;
    }

    // 5. VER SOLICITUDES PENDIENTES(Quién quiere ser mi amigo)
    async getPendingRequests(userId: number) {
        // Buscamos cualquier fila donde YO sea el destino (f_2) y el estado sea 1 (Pendiente)
        // Quitamos lógicas complejas de fechas. Si existe y es 1, muéstralo.
        const pending = await this.db.execute(sql`
            SELECT 
                p.p_pk as id, 
                p.p_nick as nick
            FROM PLAYER_FRIEND pf
            JOIN PLAYER p ON p.p_pk = pf.f_1
            WHERE pf.f_2 = ${userId} 
            AND pf.f_status_fk = 1
        `);
        
        console.log(`🔍 [DB] Buscando pendientes para User ${userId}. Encontradas: ${pending.length}`);
        return pending;
    }

    // 6. Obtener candidatos para invitar (Dropdown)
    async getUsersToInvite(userId: number) {
        const result = await this.db.execute(sql`
            SELECT p.p_pk as id, p.p_nick as nick
            FROM PLAYER p
            WHERE p.p_pk != ${userId} -- No mostrarme a mí mismo
            AND NOT EXISTS (
                -- Solo esconder si existe una relación PENDIENTE (1) o ACEPTADA (2) activa
                SELECT 1 FROM PLAYER_FRIEND pf
                WHERE 
                   ((pf.f_1 = ${userId} AND pf.f_2 = p.p_pk) OR (pf.f_1 = p.p_pk AND pf.f_2 = ${userId}))
                   AND (pf.f_status_fk = 1 OR pf.f_status_fk = 2) 
                   -- Nota: Si el último estado fuera bloqueado (3), quizás quieras esconderlo también.
                   -- Pero con esto, si hay historial viejo o rechazado, aparecerán en la lista.
            )
            ORDER BY p.p_nick ASC
        `);
        
        return result;
    }

    // 7. ELIMINAR AMIGO
    async removeFriend(userId: number, targetId: number) {
        // Borramos la relación en ambos sentidos (por si acaso)
        await this.db.execute(sql`
            DELETE FROM PLAYER_FRIEND 
            WHERE (f_1 = ${userId} AND f_2 = ${targetId}) 
               OR (f_1 = ${targetId} AND f_2 = ${userId})
        `);

        console.log(`🗑️ [DB] Amistad eliminada: ${userId} - ${targetId}`);
        // Log para ver en la terminal del backend
        console.log(`🗑️ [DB] Delete ejecutado. Notificando a User ${targetId} que User ${userId} lo borró.`);
        // NOTIFICACIÓN: Avisar al ex-amigo para que se le actualice la lista
        this.gateway.sendNotification(targetId, 'friend_removed', { 
            from: userId,
            msg: "Un usuario te ha eliminado de amigos" 
        });

        // 🔔 NOTIFICACIÓN 2 (NUEVA): A ti mismo (Actor)
        // Para que él desaparezca de TU chat inmediatamente sin recargar
        this.gateway.sendNotification(userId, 'friend_removed', { 
            from: targetId,
            msg: "Has eliminado a un amigo" 
        });

        return { ok: true, msg: "Amigo eliminado correctamente" };
    }
    
}

