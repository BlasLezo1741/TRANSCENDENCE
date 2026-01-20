import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module'; // Ajusta la ruta a tu módulo de DB
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';
import { sql, eq } from 'drizzle-orm';

@Injectable()
export class FriendsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
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
        return result;
    }

    // 5. Ver solicitudes pendientes (Quién quiere ser mi amigo)
    // Buscamos filas donde f2 soy YO, el estado es Pendiente (1), y NO hay un registro posterior
    async getPendingRequests(userId: number) {
        // Esta query es un poco más manual porque no tenemos función SQL para esto aún.
        // Hacemos una select simple de las últimas interacciones.
        const pending = await this.db.execute(sql`
            SELECT p.p_pk as id, p.p_nick as nick
            FROM player_friend pf
            JOIN player p ON pf.f_1 = p.p_pk
            WHERE pf.f_2 = ${userId} -- Yo soy el receptor
            AND pf.f_status_fk = 1   -- Estado Pendiente
            AND NOT EXISTS (         -- Y no he respondido todavía
                SELECT 1 FROM player_friend pf2 
                WHERE ((pf2.f_1 = pf.f_1 AND pf2.f_2 = pf.f_2) OR (pf2.f_1 = pf.f_2 AND pf2.f_2 = pf.f_1))
                AND pf2.f_date > pf.f_date
            )
        `);
        return pending;
    }
}