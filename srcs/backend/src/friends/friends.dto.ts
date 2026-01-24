import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FriendActionDto {
  @IsNotEmpty()
  @IsNumber()
  targetId: number; // El ID del usuario al que invitas/aceptas/bloqueas
}