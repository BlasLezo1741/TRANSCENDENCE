//backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <--- Imported to load .env
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Importamos tu nuevo receptor de mensajes (Gateway)
//import { GameGateway } from './game.gateway';
import { GatewayModule } from './gateway.module'; //adicionado en lugar de GameGateway
import { DatabaseModule } from './database.module'; // ORM DRIZZLE

// --- NEW IMPORTS ---
// Adjust the path if you placed them somewhere else, 
// but based on our plan they should be in ./auth/    
import { AuthController } from './auth/auth.controller';  
import { AuthService } from './auth/auth.service';  
// --- COUNTRIES ---
import { CountriesModule } from './countries/countries.module';
// --- FRIENDS ---
import { FriendsModule } from './friends/friends.module';
// --- AUTH MODULE ---
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Loads .env file globally
    DatabaseModule,
    CountriesModule,
    FriendsModule,
    GatewayModule,
    AuthModule, // <--- Added AuthModule here
  ],
  controllers: [
    AppController, 
    //AuthController // <--- Add Controller here (exposes /auth/login endpoints)
  ],
  providers: [
    AppService, 
    //GameGateway, 
    //AuthService    // <--- Add Service here (handles password hashing & DB)
  ],
})
export class AppModule {}
