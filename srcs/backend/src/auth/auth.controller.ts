import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    // Recibimos { username, password } del frontend
    return this.authService.loginUser(body.username, body.password);
  }

  @Post('register')
  async register(@Body() body: any) {
    // Recibimos el objeto JSON completo y pasamos los argumentos en orden:
    // 1. username
    // 2. password
    // 3. email
    // 4. birth
    // 5. country (¡Nuevo!)
    // 6. lang
    return this.authService.registerUser(
        body.username, 
        body.password, 
        body.email, 
        body.birth, 
        body.country, 
        body.lang
    );
  }
}