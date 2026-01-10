import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PaddleMoveDto {
  @IsNotEmpty()
  @IsString()
  roomId: string; // <--- NUEVO: Identificador de la sala

  @IsNotEmpty()
  @IsIn(['up', 'down', 'stop'], {
    message: 'La dirección debe ser up, down o stop',
  })
  direction: 'up' | 'down' | 'stop'; // Tipado estricto para TypeScript
}