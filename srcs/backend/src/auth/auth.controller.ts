import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.loginUser(body.user, body.pass);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.registerUser(body.user, body.pass, body.email, body.birth, body.country);
  }
}