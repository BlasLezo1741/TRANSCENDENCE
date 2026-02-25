import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database.module'; 
import * as schema from '../schema'; 
import { GameGateway } from '../game.gateway';

@Injectable()
export class StatsService { 
    
    constructor(
        @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    ) {}

    async getLeaderboard() {
            try {
                // Ejecutamos la función SQL pura que metiste en 10_functions.sql
                const result = await this.db.execute(sql`SELECT * FROM get_leaderboard(10)`);
                
                // Le decimos a TypeScript que confíe en que esto es un array y lo mapeamos
                return (result as any[]).map((row: any) => ({
                id: row.player_id,
                nick: row.nick,
                avatar: row.avatar_url,
                wins: Number(row.wins)
            }));
            } catch (error) {
                console.error("Error obteniendo el leaderboard:", error);
                return [];
            }
    }

    // HISTORIAL De partidas
    async getMatchHistory(userId: number) {
        try {
            // Llamamos a la nueva función SQL pasándole el ID del usuario
            const result = await this.db.execute(sql`SELECT * FROM get_match_history(${userId}, 15)`);
            
            // Drizzle / postgres-js array formatting
            const rows = (result as any[]);
            
            return rows.map((row: any) => ({
                id: row.match_id,
                date: row.match_date,
                mode: row.mode_name,
                myScore: row.my_score || 0,
                opponentId: row.opponent_id,
                opponent: row.opponent_nick || 'Bot / Desconocido',
                opponentAvatar: row.opponent_avatar,
                opponentScore: row.opponent_score || 0,
                won: row.won
            }));
        } catch (error) {
            console.error("❌ Error obteniendo el historial de partidas:", error);
            return [];
        }
    }
}