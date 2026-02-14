
/*Registramos las métricas para que Prometheus las vea*/
import { Module } from '@nestjs/common';
import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { DatabaseModule } from '../database.module';

@Module({
//   imports: [
//     //TypeOrmModule,
//     DatabaseModule,
//   ],
  providers: [
    MetricsService,
    // Definimos los proveedores de métricas
    makeGaugeProvider({
      name: 'transcendence_users_total',
      help: 'Número total de usuarios registrados en la base de datos',
    }),
    makeGaugeProvider({
      name: 'transcendence_matches_total',
      help: 'Número total de partidas jugadas históricamente',
    }),
    makeGaugeProvider({
      name: 'transcendence_active_friendships',
      help: 'Número total de amistades confirmadas',
    }),
    makeGaugeProvider({
      name: 'transcendence_chat_messages_total',
      help: 'Volumen total de mensajes enviados',
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}