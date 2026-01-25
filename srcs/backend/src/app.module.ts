//backend/src/app.module.ts
import { Module } from '@nestjs/common';
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
    DatabaseModule,
    CountriesModule,
    FriendsModule,
    GatewayModule,
    AuthModule,
  ],
  controllers: [
    AppController, 
  ],
  providers: [
    AppService, 
    //GameGateway,
  ],
})
export class AppModule {}
