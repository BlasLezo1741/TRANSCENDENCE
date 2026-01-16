// ¿Qué es un Controller?Un Controller en NestJS es como un recepcionista de un hotel:

// Recibe las peticiones HTTP del frontend
// Las direcciona al servicio correcto
// Devuelve la respuesta al cliente
// No hace la lógica compleja (eso lo hace el Service), solo recibe y entrega.

// Interceptor: Cuando el frontend haga un fetch a /auth/register, 
// el ValidationPipe mirará el JSON.
// Validación: Si falta el email o la contraseña es corta, 
// enviará un error detallado al frontend.
// Ejecución: Si todo está bien, le pasará los datos limpios al 
// AuthService para que Drizzle los inserte en la tabla player.

// ------------------  Importaciones ---------------//

// Controller - Decorador que marca esta clase como un controlador
// Post - Decorador para definir rutas POST (envío de datos)
// Body - Decorador para extraer el cuerpo de la petición HTTP

import { Controller, Post, Body } from '@nestjs/common';

// Importa el servicio que tiene toda la lógica de registro.
import { AuthService } from './auth.service';

// Importa el DTO que define qué datos esperas recibir.
import { RegisterUserDto } from '../dto/register-user.dto';

// @Controller('auth')` define la **ruta base** de este controlador.
// Todas las rutas de este controlador empezarán con `/auth`:
//
// http://localhost:3000/auth/...
//                      ^^^^
//                  ruta base

@Controller('auth') // La ruta base será http://localhost:3000/auth



export class AuthController {
  // Constructor (Inyección de dependencias)
  //¿Qué hace?

  // Recibe el AuthService (el servicio con la lógica de negocio)
  // private readonly - Crea automáticamente una propiedad privada e inmutable
  // Ahora puedes usar this.authService en cualquier método

  // Analogía: El recepcionista (Controller) tiene el teléfono directo 
  // al gerente (Service). 
  // Cuando alguien pregunta algo, el recepcionista llama al gerente.  
  constructor(private readonly authService: AuthService) {}

  //**Define una ruta POST:**
  // Ruta completa: POST http://localhost:3000/auth/register
  //                                     ^^^^  ^^^^^^^^
  //                                 @Controller  @Post

  //Tipos de decoradores HTTP:
  //@Get('users')     → GET /auth/users
  //@Post('login')    → POST /auth/login
  //@Put('update')    → PUT /auth/update
  //@Delete('delete') → DELETE /auth/delete
  //@Patch('edit')    → PATCH /auth/edit



  @Post('register') // Endpoint: POST /auth/register


  //async register()
  //El método es asíncrono porque llama a un servicio que hace operaciones 
  // async (base de datos, HTTP, etc.)
  //@Body() registerUserDto: RegisterUserDto
  //@Body() extrae el cuerpo de la petición HTTP.

  async register(@Body() registerUserDto: RegisterUserDto) {
    // Si los datos no cumplen el DTO, NestJS responderá 400 antes de llegar aquí
    return this.authService.register(registerUserDto);
  }
}