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
        
        await this.db.insert(schema.playerFriend).values({
            f1: userId,
            f2: targetId,
            fStatusFk: this.STATUS_PENDING
        });
        // NOTIFICACIÓN DE SOLICITUD
        this.gateway.sendNotification(targetId, 'friend_request', { 
            from: userId,
            msg: "Tienes una nueva solicitud" 
        });
        return { ok: true, msg: "Solicitud enviada" };
    }

    // 2. Aceptar Solicitud (Yo -> Tú : Aceptado)
    // Nota: Insertamos un nuevo registro con fecha actual. Tu función SQL cogerá este como el válido.
    async acceptRequest(userId: number, targetId: number) {
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

    // 4. Obtener Lista de Amigos (Usando tu función SQL corregida)
    async getFriends(userId: number) {
        // Llamamos a la función SQL que arreglamos antes: get_player_friends(ID)
        const result = await this.db.execute(sql`
            SELECT * FROM get_player_friends(${userId})
        `);
        // 🔥 NUEVO: ENRIQUECEMOS LOS DATOS CON EL ESTADO ONLINE
        // Mapeamos el resultado para añadir el campo 'is_online' preguntando al Gateway
        const enrichedResult = result.map((friend: any) => ({
            id: friend.friend_id,             // Mapeamos friend_id a id para el frontend
            friend_nick: friend.friend_nick,
            friend_lang: friend.friend_lang,
            friendship_since: friend.friendship_since,
            // // Aquí usamos el ID para preguntar al Gateway
            // status: this.gateway.isUserOnline(friend.id) ? 'online' : 'offline'
            // 🔥 CORRECCIÓN DE TIPOS: Forzamos Number() por si Postgres devuelve string
            status: this.gateway.isUserOnline(Number(friend.friend_id)) ? 'online' : 'offline'
        }));

        return enrichedResult;
        //return result;
    }

    // // 5. Ver solicitudes pendientes (Quién quiere ser mi amigo)
    // // Buscamos filas donde f2 soy YO, el estado es Pendiente (1), y NO hay un registro posterior
    // async getPendingRequests(userId: number) {
    //     // Esta query es un poco más manual porque no tenemos función SQL para esto aún.
    //     // Hacemos una select simple de las últimas interacciones.
    //     const pending = await this.db.execute(sql`
    //         SELECT p.p_pk as id, p.p_nick as nick
    //         FROM player_friend pf
    //         JOIN player p ON pf.f_1 = p.p_pk
    //         WHERE pf.f_2 = ${userId} -- Yo soy el receptor
    //         AND pf.f_status_fk = 1   -- Estado Pendiente
    //         AND NOT EXISTS (         -- Y no he respondido todavía
    //             SELECT 1 FROM player_friend pf2 
    //             WHERE ((pf2.f_1 = pf.f_1 AND pf2.f_2 = pf.f_2) OR (pf2.f_1 = pf.f_2 AND pf2.f_2 = pf.f_1))
    //             AND pf2.f_date > pf.f_date
    //         )
    //     `);
    //     return pending;
    // }

    // 5. Ver solicitudes pendientes (MEJORADO)
    async getPendingRequests(userId: number) {
        // Usamos ROW_NUMBER para obtener solo el ÚLTIMO evento de cada pareja
        const pending = await this.db.execute(sql`
            SELECT 
                p.p_pk as id, 
                p.p_nick as nick
            FROM (
                SELECT 
                    f_1, f_2, f_status_fk,
                    ROW_NUMBER() OVER(
                        PARTITION BY LEAST(f_1, f_2), GREATEST(f_1, f_2) 
                        ORDER BY f_date DESC
                    ) as rn
                FROM PLAYER_FRIEND
                WHERE f_1 = ${userId} OR f_2 = ${userId}
            ) last_interaction
            -- Hacemos JOIN con PLAYER para saber el nombre del que me envió la solicitud (f_1)
            JOIN PLAYER p ON p.p_pk = last_interaction.f_1
            WHERE 
                last_interaction.rn = 1            -- Solo miramos el evento más reciente
                AND last_interaction.f_status_fk = 1 -- El estado debe ser PENDIENTE (1)
                AND last_interaction.f_2 = ${userId} -- Y el receptor debo ser YO
        `);
        
        return pending;
    }

    // NUEVO MÉTODO: Obtener candidatos para invitar (Dropdown)
    async getUsersToInvite(userId: number) {
        // Selecciona todos los usuarios excepto:
        // 1. Yo mismo
        // 2. Gente con la que ya tenga relación (Amigos o Pendientes)
        const result = await this.db.execute(sql`
            SELECT p.p_pk as id, p.p_nick as nick
            FROM PLAYER p
            WHERE p.p_pk != ${userId}
            AND NOT EXISTS (
                SELECT 1 FROM PLAYER_FRIEND pf
                WHERE (pf.f_1 = ${userId} AND pf.f_2 = p.p_pk)
                   OR (pf.f_1 = p.p_pk AND pf.f_2 = ${userId})
            )
            ORDER BY p.p_nick ASC
        `);
        
        return result;
    }
    
}