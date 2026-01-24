import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class JoinQueueDto {

  @IsString()
  @IsIn(['1v1_local', '1v1_remote', 'tournament'], {
    message: 'El modo de juego debe ser 1v1 o tournament',
  })
  mode: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;
}