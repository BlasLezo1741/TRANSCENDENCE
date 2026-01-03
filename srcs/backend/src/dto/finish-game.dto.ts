import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class FinishGameDto {
  @IsString()
  @IsNotEmpty()
  // Validamos que el ID del ganador sea texto (en el futuro será un UUID de la DB)
  winnerId: string;

  @IsString()
  @IsOptional()
  // Podemos recibir el ID de la habitación para cerrar la sesión de juego
  roomId?: string;
}