import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class JoinQueueDto {
  @IsString()
  @IsNotEmpty()
  userId: string; 

  @IsString()
  @IsIn(['1v1', 'tournament'], {
    message: 'El modo de juego debe ser 1v1 o tournament',
  })
  mode: string;
}