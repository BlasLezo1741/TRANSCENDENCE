//Para que el microservicio reconozca el controlador, el servicio y la conexión 
// a la base de datos, el archivo auth.module.ts debe actuar como el "pegamento"
//  que une todas las piezas.

// Integración con Drizzle: Al importar DatabaseModule, el AuthService podrá 
// recibir mediante @Inject('DRIZZLE_CONNECTION') la instancia de la base de 
// datos que ya configuraste.

// Comunicación Inter-servicios: El HttpModule es el que permite que NestJS 
// hable con tu contenedor de Python. Con el timeout de 5 segundos; si el 
// servicio de Python está caído, NestJS no se quedará colgado indefinidamente.

// Encapsulación: Mantener la lógica de autenticación en su propio módulo 
// (AuthModule) facilita que, cuando crees el módulo de "Chat" o "Game", 
// estos no tengan acceso directo a las contraseñas, sino que tengan que pasar 
// por las interfaces oficiales.

// Module - Decorador que marca esta clase como un módulo de NestJS.

import { Module } from '@nestjs/common';

// HttpModule - proporciona HttpService para hacer peticiones HTTP (a tu totp).
import { HttpModule } from '@nestjs/axios';

// Importa el controlador y servicio que creaste.
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Importa el módulo que configura la conexión a la base de datos (Drizzle).
import { DatabaseModule } from '../database.module'; // Importante para Drizzle

// El decorador @Module recibe un objeto con 4 propiedades principales:
// imports son los módulos externos que tu AuthModule necesita usar.
//   DatabaseModule,  ¿Por qué lo necesitas?

//       AuthService usa this.db para insertar usuarios en la base de datos
//       DatabaseModule es quien proporciona esa conexión db
//       Sin DatabaseModule, no hay acceso a la base de datos
//       Analogía: como importar el departamento de IT para acceder a la computadora.

//   HttpModule.register  ¿Por qué lo necesitas?

//       En AuthService usas this.httpService.post() para llamar al servicio Python
//       HttpModule proporciona HttpService

//       Configuración:

//       timeout: 5000 - Si petición tarda más de 5000ms , cancélala y lanza error
//       maxRedirects: 5 - Permite máximo 5 redirecciones HTTP

//  controllers - Los "recepcionistas"
//   controllers es un array con todos los controladores de este módulo.
//   ¿Qué hace esto?

//   Registra AuthController en NestJS
//   NestJS activa automáticamente las rutas definidas en él
//   POST /auth/register queda disponible

// providers son las clases que se pueden inyectar en otros lugares (servicios, helpers, etc.).
//   ¿Qué hace esto?

//       Registra AuthService como un provider
//       Permite que AuthController lo inyecte en su constructor
//       NestJS crea automáticamente una instancia de AuthService


//  exports hace que AuthService esté disponible para otros módulos que importen AuthModule.

@Module({
  imports: [
    // 1. Necesario para que el AuthService pueda usar this.db
    DatabaseModule, 
    // 2. Necesario para que el AuthService pueda llamar al servicio de Python (2faserver)
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // Exportamos el servicio por si otros módulos necesitan validar sesiones en el futuro
  exports: [AuthService], 
})
export class AuthModule {}