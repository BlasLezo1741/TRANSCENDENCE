import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Importante: la conexión
import { AppController } from './app.controller';
import { AppService } from './app.service';
//Importamos tu nuevo receptor de mensajes (Gateway)
import { GameGateway } from './game.gateway';
import { Match } from './match.entity'; //

@Module({
  imports: [
    // Configuración de la conexión a PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'dbserver',           // Nombre del servicio en docker-compose
      port: 5432,
      username: 'postgres',        // POSTGRES_USER de tu .env
      password: 'example',         // POSTGRES_PASSWORD de tu .env
      database: 'transcendence',   // POSTGRES_DB de tu .env
      autoLoadEntities: true,      // Detecta automáticamente archivos .entity.ts
      synchronize: false,          // No modifica las tablas de tu compañero
    }),
    TypeOrmModule.forFeature([Match]),
  ],
  controllers: [AppController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
