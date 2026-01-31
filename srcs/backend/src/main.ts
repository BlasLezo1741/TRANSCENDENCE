import 'dotenv/config'; // Carga las variables de entorno desde el archivo .env
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common'; // Importa el Logger

async function bootstrap() {
  // Creamos la aplicación
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap'); // Creamos una instancia manual

  // Puertos y URLs desde el entorno
  const port = process.env.BE_CONTAINER_PORT || 3000;
  const frontendUrl = process.env.VITE_FRONTEND_URL;
  logger.log(`Permitiendo CORS para: ${frontendUrl}`);

// 1. Habilitamos CORS para peticiones HTTP normales
  app.enableCors({
    //origin: [frontendUrl, 'http://localhost:5173'],
    //origin: 'http://localhost:5173', // La URL de tu React
    // En Codespaces, el origen debe ser la URL del puerto 5173 o '*' para pruebas
    origin: true, // Esto refleja automáticamente el origen de la petición (muy útil en Codespaces)
    //origin: (origin, callback) => {
    // Si el origen es exactamente igual al .env O contiene github.dev
    /* if (!origin || origin === frontendUrl || origin.includes('github.dev')) {
      callback(null, true);
    } else {
      // ESTA LÍNEA ES CLAVE: Te dirá en los logs qué origin está llegando realmente
      logger.error(`BLOQUEO CORS: El navegador envió el origen [${origin}], pero esperábamos [${frontendUrl}]`);
      callback(new Error('Not allowed by CORS'));
    } */
  //},
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false, // NestJS responderá al preflight automáticamente
    optionsSuccessStatus: 204, // El estándar para OPTIONS exitosos
  });

  // 2. Escuchar en '0.0.0.0' es CRÍTICO para Docker
  // Esto permite que el contenedor acepte conexiones de fuera de sí mismo
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Servidor corriendo en puerto: ${port}`);
}
bootstrap();
