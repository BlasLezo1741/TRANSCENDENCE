import { Controller, Post, Get, Body, Req, Res, UseGuards, Query, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== TRADITIONAL AUTHENTICATION ====================

  @Post('login')
  async login(@Body() body: any) {
    // Receive { username, password } from frontend
    return this.authService.loginUser(body.username, body.password);
  }

  @Post('register')
  async register(@Body() body: any) {
    // Receive complete JSON object and pass arguments in order:
    // 1. username, 2. password, 3. email, 4. birth, 5. country, 6. lang
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
  async googleAuth(
    @Query('browserLang') browserLang?: string,
    @Query('browserCountry') browserCountry?: string,
  ) {
    // Store browser data in request state (will be preserved through OAuth flow)
    // Passport automatically redirects to Google login page
    console.log('[Google OAuth] Initiating OAuth with browser data:', {
      browserLang,
      browserCountry,
    });
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: any,
    @Res() res: Response,
    @Query('browserLang') browserLang?: string,
    @Query('browserCountry') browserCountry?: string,
  ) {
    try {
      const oauthUser = req.user;

      console.log('[Google Callback] Received data:', {
        user: oauthUser.nick,
        googleLang: oauthUser.googleLang,
        googleCountry: oauthUser.googleCountry,
        browserLang: browserLang,
        browserCountry: browserCountry,
      });

      // Language priority: Google locale > Browser language
      const finalLang = oauthUser.googleLang || browserLang || null;

      // Country priority: Google locale > Browser country
      const finalCountry = oauthUser.googleCountry || browserCountry || null;

      console.log('[Google Callback] Final values selected:', {
        language: finalLang,
        country: finalCountry,
      });

      // Find or create user with detected language/country
      const user = await this.authService.findOrCreateOAuthUser({
        oauthId: oauthUser.oauthId,
        oauthProvider: oauthUser.oauthProvider,
        email: oauthUser.email,
        nick: oauthUser.nick,
        avatarUrl: oauthUser.avatarUrl,
        language: finalLang,
        country: finalCountry,
      });

      // Generate JWT token
      const { accessToken } = this.authService.generateJwtToken(user);

      // Redirect to frontend with token
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      
      console.log('[Google Callback] Redirecting to frontend with token');
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (error) {
      console.error('[Google Callback] Error:', error);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  }

  // ==================== 42 SCHOOL OAUTH ====================

  @Get('42')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuth(
    @Query('browserLang') browserLang?: string,
    @Query('browserCountry') browserCountry?: string,
  ) {
    // Passport automatically redirects to 42 login page
    console.log('[42 OAuth] Initiating OAuth with browser data:', {
      browserLang,
      browserCountry,
    });
  }

  @Get('42/callback')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuthRedirect(
    @Req() req: any,
    @Res() res: Response,
    @Query('browserLang') browserLang?: string,
    @Query('browserCountry') browserCountry?: string,
  ) {
    try {
      const oauthUser = req.user;

      console.log('[42 Callback] Received data:', {
        user: oauthUser.nick,
        campus42Country: oauthUser.campus42Country,
        campusName: oauthUser.campusName,
        campusCountry: oauthUser.campusCountry,
        browserLang: browserLang,
        browserCountry: browserCountry,
      });

      // Language: Only from browser (42 doesn't provide language)
      const finalLang = browserLang || null;

      // Country priority: Browser country > 42 campus country
      const finalCountry = browserCountry || oauthUser.campus42Country || null;

      console.log('[42 Callback] Final values selected:', {
        language: finalLang,
        country: finalCountry,
        campusUsed: !browserCountry && oauthUser.campus42Country ? oauthUser.campusName : 'not used',
      });

      // Find or create user with detected language/country
      const user = await this.authService.findOrCreateOAuthUser({
        oauthId: oauthUser.oauthId,
        oauthProvider: oauthUser.oauthProvider,
        email: oauthUser.email,
        nick: oauthUser.nick,
        avatarUrl: oauthUser.avatarUrl,
        language: finalLang,
        country: finalCountry,
      });

      // Generate JWT token
      const { accessToken } = this.authService.generateJwtToken(user);

      // Redirect to frontend with token
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      
      console.log('[42 Callback] Redirecting to frontend with token');
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (error) {
      console.error('[42 Callback] Error:', error);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  }

  // ==================== PROFILE COMPLETION ====================

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  async completeProfile(@Req() req: any, @Body() profileData: CompleteProfileDto) {
    const userId = req.user.id;

    console.log('[Complete Profile] User', userId, 'updating profile:', profileData);

    const updatedUser = await this.authService.completeProfile(userId, profileData);
    const { accessToken } = this.authService.generateJwtToken(updatedUser);

    return {
      accessToken,
      user: {
        id: updatedUser.pPk,
        nick: updatedUser.pNick,
        email: updatedUser.pMail,
        avatarUrl: updatedUser.pAvatarUrl,
        country: updatedUser.pCountry,
        language: updatedUser.pLang,
        profileComplete: updatedUser.pProfileComplete,
      },
    };
  }

  // ==================== GET CURRENT USER ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.authService.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.pPk,
      nick: user.pNick,
      email: user.pMail,
      avatarUrl: user.pAvatarUrl,
      country: user.pCountry,
      language: user.pLang,
      profileComplete: user.pProfileComplete,
    };
  }
}