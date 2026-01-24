import { IsIn, IsNotEmpty, IsString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaddleMoveDto {
  @IsNotEmpty()
  @IsString()
  roomId: string; // <--- NUEVO: Identificador de la sala

  // OPCIÓN A: Dirección Clásica (Teclado)
  @IsNotEmpty()
  @IsOptional()
  @IsIn(['up', 'down', 'stop'], {
    message: 'La dirección debe ser up, down o stop',
  })
  direction?: 'up' | 'down' | 'stop'; // Tipado estricto para TypeScript

  // OPCIÓN B: Posición Absoluta (Ratón - Nuevo sistema)
  // Añadimos la nueva propiedad 'y' (posición normalizada 0 a 1)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  y?: number;
}