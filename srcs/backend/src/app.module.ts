/*
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
*/
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Importamos tu nuevo receptor de mensajes (Gateway)
import { GameGateway } from './game.gateway';
import { DatabaseModule } from './database.module'; // ORM DRIZZLE

// --- NEW IMPORTS ---
// Adjust the path if you placed them somewhere else, 
// but based on our plan they should be in ./auth/
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
// --- COUNTRIES ---
import { CountriesModule } from './countries/countries.module';

@Module({
  imports: [
    DatabaseModule,
    CountriesModule,
  ],
  controllers: [
    AppController, 
    AuthController // <--- Add Controller here (exposes /auth/login endpoints)
  ],
  providers: [
    AppService, 
    GameGateway, 
    AuthService    // <--- Add Service here (handles password hashing & DB)
  ],
})
export class AppModule {}
