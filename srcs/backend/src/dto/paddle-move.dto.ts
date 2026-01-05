import { IsIn, IsNotEmpty } from 'class-validator';

export class PaddleMoveDto {
  @IsNotEmpty()
  @IsIn(['up', 'down', 'stop'], {
    message: 'La dirección debe ser up, down o stop',
  })
  direction: string;
}