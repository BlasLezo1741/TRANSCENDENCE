import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService, // Inject ConfigService
    ) {}

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
  // ==================== GOOGLE OAUTH ====================
  
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Passport automatically redirects to Google login page
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    const { accessToken } = this.authService.generateJwtToken(user);

    // Get frontend URL from env, fallback to localhost for dev
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    // OPTIONAL: Check if profile is complete to redirect to specific page
    // if (!user.pProfileComplete) {
    //    return res.redirect(`${frontendUrl}/complete-profile?token=${accessToken}`);
    // }

    res.redirect(`${frontendUrl}/login?token=${accessToken}`);
  }

  // ==================== 42 SCHOOL OAUTH ====================

  @Get('42')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuth(@Req() req) {
    // Passport automatically redirects to 42 login page
  }

  @Get('42/callback')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuthRedirect(@Req() req, @Res() res: Response) {
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    const { accessToken } = this.authService.generateJwtToken(user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    res.redirect(`${frontendUrl}/login?token=${accessToken}`);
  }
}