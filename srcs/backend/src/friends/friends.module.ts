import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { DatabaseModule } from '../database.module'; // Necesario para acceder a la DB

@Module({
  imports: [DatabaseModule], // Importamos DB para que el Service pueda usar 'DRIZZLE'
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService] // Opcional, por si otros módulos necesitan usar este servicio
})
export class FriendsModule {}