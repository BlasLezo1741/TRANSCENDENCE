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
}