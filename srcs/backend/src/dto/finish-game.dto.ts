import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class FinishGameDto {
  @IsString()
  @IsNotEmpty()
  roomId: string; // Obligatorio para cerrar el socket

  @IsString()
  @IsNotEmpty()
  winnerId: string; // Nombre o ID del jugador que ganó

  @IsNumber()
  @IsNotEmpty()
  matchId: number; // La clave primaria (PK) de la tabla match
}