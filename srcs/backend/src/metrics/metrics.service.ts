
/*Las 4 "Super-Métricas" que vamos a implementar
Usaremos DataSource para lanzar consultas SQL directas (Raw SQL)

1.Usuarios Totales (transcendence_users_total):
Fuente: Tabla PLAYER.
Valor: Crecimiento de tu comunidad.

2.Partidas Jugadas (transcendence_matches_total):
Fuente: Tabla MATCH.
Valor: Actividad histórica del juego.

3.Amistades Activas (transcendence_active_friendships):
Fuente: Tabla PLAYER_FRIEND (filtrando por f_status_fk = 2 que es "Accepted").
Valor: Engagement social.

4.Mensajes Totales (transcendence_chat_messages_total):
Fuente: Tabla direct_message.
Valor: Uso del chat.
*/

import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { DRIZZLE } from '../database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '../schema'; // Ajusta la ruta a tu schema


@Injectable()
export class MetricsService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    // Inyectamos los medidores (Gauges)
    @InjectMetric('transcendence_users_total') public usersGauge: Gauge<string>,
    @InjectMetric('transcendence_matches_total') public matchesGauge: Gauge<string>,
    @InjectMetric('transcendence_active_friendships') public friendsGauge: Gauge<string>,
    @InjectMetric('transcendence_chat_messages_total') public messagesGauge: Gauge<string>,
  ) {}

  // Se ejecuta cada 10 segundos. Puedes cambiarlo a CronExpression.EVERY_MINUTE
 @Cron(CronExpression.EVERY_10_SECONDS)
  async updateMetrics() {
    try {
      console.log('🔄 [METRICS] Iniciando actualización...'); // <--- CHIVATO 1

      // 1. Usuarios
      const users = await this.db.execute(sql`SELECT COUNT(*) as count FROM player`);
      const userCount = Number(users[0].count);
      this.usersGauge.set(userCount);
      console.log(`   - Usuarios en DB: ${userCount}`); // <--- CHIVATO 2

      // 2. Partidas
      try {
        const matches = await this.db.execute(sql`SELECT COUNT(*) as count FROM "match"`);
        const matchCount = Number(matches[0].count);
        this.matchesGauge.set(matchCount);
        console.log(`   - Partidas en DB: ${matchCount}`);
      } catch (e) { console.log('   - Tabla match no encontrada aún'); }

      // 3. Amigos
      const friends = await this.db.execute(sql`SELECT COUNT(*) as count FROM player_friend WHERE f_status_fk = 2`);
      const friendCount = Number(friends[0].count);
      this.friendsGauge.set(friendCount);
      console.log(`   - Amigos en DB: ${friendCount}`);

      // 4. Mensajes
      const messages = await this.db.execute(sql`SELECT COUNT(*) as count FROM direct_message`);
      const msgCount = Number(messages[0].count);
      this.messagesGauge.set(msgCount);
      console.log(`   - Mensajes en DB: ${msgCount}`);

    } catch (error) {
      console.error('❌ Error CRITICAL en métricas:', error);
    }
  }
}