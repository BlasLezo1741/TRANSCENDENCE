import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//Importamos tu nuevo receptor de mensajes (Gateway)
import { GameGateway } from './game.gateway';
import { DatabaseModule } from './database.module';// ORM DRIZZLE
//import { Match } from './schema'; // No hace falta referenciar a las tablas individualemnte con Drizzle

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
