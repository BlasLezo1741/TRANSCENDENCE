import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Creamos la aplicación
  const app = await NestFactory.create(AppModule);
  //await app.listen(process.env.PORT ?? 3000);

// 1. Habilitamos CORS para peticiones HTTP normales
  app.enableCors({
    //origin: 'http://localhost:5173', // La URL de tu React
    // En Codespaces, el origen debe ser la URL del puerto 5173 o '*' para pruebas
    origin: true, // Esto refleja automáticamente el origen de la petición (muy útil en Codespaces)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Escuchar en '0.0.0.0' es CRÍTICO para Docker
  // Esto permite que el contenedor acepte conexiones de fuera de sí mismo
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Servidor corriendo en: http://localhost:${port}`);
}
bootstrap();
