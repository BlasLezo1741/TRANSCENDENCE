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
  // Prioridad: 1. Variable de entorno, 2. Valor fijo 3010
  const port = process.env.PORT || 3010;

  // Habilitar CORS para que el frontend pueda conectar
  // Como tu frontend corre en el puerto 5174 y el backend en el 3000, 
  // el navegador bloqueará la petición por seguridad (CORS error). 
  // Debes habilitarlo en el backend.

  app.enableCors({
    origin: 'http://localhost:5174', // URL de tu frontend de prueba
    methods: 'GET,POST',
    credentials: true,
  });

  // Esto activa la validación automática usando el DTO que creamos
  // Configurar ValidationPipe (Validación automática)

  // Esta es una configuración MUY IMPORTANTE para seguridad y validación.
  // whitelist: true
  // ¿Qué hace? NestJS elimina los campos que NO estén definidos en tu DTO.
  // 
  // forbidNonWhitelisted: true
  // ¿Qué hace? NestJS lanza un error si detecta campos que no deberían estar.
  //
  // `transform: true`
  // ¿Qué hace? Convierte automáticamente los tipos de datos al tipo correcto.

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Inicia el servidor en el puerto 3000
  // await espera a que el servidor esté listo
  // Después de esto, tu API está funcionando en http://localhost:3000
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en http://localhost:3000`);
}
bootstrap();