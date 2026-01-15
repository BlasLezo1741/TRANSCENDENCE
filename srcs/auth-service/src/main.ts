// NestFactory es una clase especial que se encarga de crear tu aplicación 
// NestJS. Es como el "constructor de aplicaciones".

import { NestFactory } from '@nestjs/core';
// ValidationPipe es un "pipe" (tubería) que valida automáticamente los datos 
// que llegan a tu backend. Verifica que sean correctos antes de procesarlos.

import { ValidationPipe } from '@nestjs/common';


// Importa el módulo principal de tu aplicación. En NestJS todo se organiza 
// en módulos, y AppModule es el módulo raíz que contiene todo lo demás.
import { AppModule } from './app.module';

// Es una función asíncrona que arranca (bootstrap = arrancar) tu aplicación. 
// Es el punto de partida de todo tu backend.
async function bootstrap() {
  // NestFactory.create() crea una instancia de tu aplicación NestJS
  // Le pasas AppModule como parámetro (tu módulo principal)
  // await espera a que la aplicación se cree completamente
  // Guarda la aplicación en la variable app

  // Analogía: Es como construir una casa. Le das los planos (AppModule) al 
  // constructor (NestFactory), y te devuelve la casa construida (app).

  const app = await NestFactory.create(AppModule);

  // Esto activa la validación automática usando el DTO que creamos
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,     // Elimina campos que no estén en el DTO
    forbidNonWhitelisted: true, // Lanza error si envían campos extra
    transform: true,     // Convierte los tipos automáticamente
  }));

  await app.listen(3000);
}
bootstrap();