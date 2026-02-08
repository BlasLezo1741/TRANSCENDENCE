import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Body, 
  Req, 
  Res, 
  UseGuards,
  Request,
  UnauthorizedException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response } from 'express';


@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== TRADITIONAL AUTHENTICATION ====================

  @Post('login')
  async login(@Body() body: any) {
    this.logger.log(`📡 [login] Login attempt for username: ${body.username}`);
    
    const result = await this.authService.loginUser(body.username, body.password);
    
    if (result.ok && result.user) {
      this.logger.log(`✅ [login] Successful login for: ${body.username}`);
      
      // Generate JWT token for successful login
      const user = result.user;
      const { accessToken } = this.authService.generateJwtToken({
        pPk: user.id,
        pNick: user.name,
        pMail: user.email || '',
      });
      
      // Add token to response
      const response = {
        ...result,
        token: accessToken
      };
      
      this.logger.log(`🔑 [login] Token generated for user: ${user.name}`);
      return response;
    } else {
      this.logger.warn(`⚠️ [login] Failed login for: ${body.username} - ${result.msg}`);
      return result;
    }
  }

  @Post('register')
  async register(@Body() body: any) {
    this.logger.log(`📡 [register] Registration attempt for username: ${body.username}`);
    this.logger.debug(`📝 [register] Registration data:`, {
      username: body.username,
      email: body.email,
      country: body.country,
      lang: body.lang,
      enabled2FA: body.enabled2FA || false
    });

    const result = await this.authService.registerUser(
      body.username, 
      body.password, 
      body.email, 
      body.birth, 
      body.country, 
      body.lang,
      body.enabled2FA || false
    );

    if (result.ok) {
      this.logger.log(`✅ [register] User registered successfully: ${body.username}`);
    } else {
      this.logger.warn(`⚠️ [register] Registration failed: ${result.msg}`);
    }

    return result;
  }

  @Post('verify-totp')
  async verifyTotp(@Body() body: any) {
    this.logger.log(`📡 [verify-totp] TOTP verification for user ID: ${body.userId}`);
    
    const { userId, totpCode } = body;
    const result = await this.authService.verifyTOTP(userId, totpCode);

    if (result.ok) {
      this.logger.log(`✅ [verify-totp] TOTP verified for user: ${userId}`);
      
      // Generate JWT token for successful 2FA verification
      const user = await this.authService.findUserById(userId);
      if (user) {
        const { accessToken } = this.authService.generateJwtToken(user);
        const response = {
          ...result,
          token: accessToken
        };
        this.logger.log(`🔑 [verify-totp] Token generated for user: ${user.pNick}`);
        return response;
      }
    } else {
      this.logger.warn(`⚠️ [verify-totp] TOTP verification failed for user: ${userId}`);
    }

    return result;
  }

  @Post('verify-backup')
  async verifyBackup(@Body() body: any) {
    this.logger.log(`📡 [verify-backup] Backup code verification for user ID: ${body.userId}`);
    
    const { userId, totpCode } = body;
    const result = await this.authService.verifyBackupCode(userId, totpCode);

    if (result.ok) {
      this.logger.log(`✅ [verify-backup] Backup code verified for user: ${userId}`);
      
      // Generate JWT token for successful backup code verification
      const user = await this.authService.findUserById(userId);
      if (user) {
        const { accessToken } = this.authService.generateJwtToken(user);
        const response = {
          ...result,
          token: accessToken
        };
        this.logger.log(`🔑 [verify-backup] Token generated for user: ${user.pNick}`);
        return response;
      }
    } else {
      this.logger.warn(`⚠️ [verify-backup] Backup code verification failed for user: ${userId}`);
    }

    return result;
  }

  // ==================== GOOGLE OAUTH ====================
  
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    this.logger.log('📡 [google] Redirecting to Google OAuth...');
    // Passport automatically redirects to Google login page
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    this.logger.log('📡 [google/callback] Google OAuth callback received');
    
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    this.logger.log(`✅ [google/callback] User authenticated: ${user.pNick}`);
    
    const { accessToken } = this.authService.generateJwtToken(user);

    // Get frontend URL from env, fallback to localhost for dev
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    this.logger.log(`🔄 [google/callback] Redirecting to: ${frontendUrl}/?token=${accessToken}`);
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
  }

  // ==================== 42 SCHOOL OAUTH ====================

  @Get('42')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuth(@Req() req) {
    this.logger.log('📡 [42] Redirecting to 42 School OAuth...');
    // Passport automatically redirects to 42 login page
  }

  @Get('42/callback')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuthRedirect(@Req() req, @Res() res: Response) {
    this.logger.log('📡 [42/callback] 42 School OAuth callback received');
    
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    this.logger.log(`✅ [42/callback] User authenticated: ${user.pNick}`);
    
    const { accessToken } = this.authService.generateJwtToken(user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    this.logger.log(`🔄 [42/callback] Redirecting to: ${frontendUrl}/?token=${accessToken}`);
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * GET /auth/profile
   * Get current user's profile data
   * Requires JWT authentication
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    this.logger.log(`📡 [getProfile] Request from user ID: ${req.user.sub}`);
    
    const userId = req.user.sub;
    const user = await this.authService.findUserById(userId);
    
    if (!user) {
      this.logger.error(`❌ [getProfile] User not found: ${userId}`);
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const profileData = {
      id: user.pPk,
      nick: user.pNick,
      email: user.pMail,
      birth: user.pBir,
      country: user.pCountry,
      lang: user.pLang,
      avatarUrl: user.pAvatarUrl,
      oauthProvider: user.pOauthProvider,
    };

    this.logger.log(`✅ [getProfile] Profile sent for user: ${user.pNick}`);
    return profileData;
  }

  /**
   * PUT /auth/profile
   * Update current user's profile
   * Requires JWT authentication
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req, 
    @Body() updateData: {
      nick?: string;
      email?: string;
      birth?: string;
      country?: string;
      lang?: string;
      avatarUrl?: string; 
      currentPassword?: string;
      newPassword?: string;
    }
  ) {
    this.logger.log(`📡 [updateProfile] Request from user ID: ${req.user.sub}`);
    this.logger.debug(`📝 [updateProfile] Update data:`, {
      nick: updateData.nick,
      email: updateData.email,
      birth: updateData.birth,
      country: updateData.country,
      lang: updateData.lang,
      avatarUrl: updateData.avatarUrl,
      passwordChange: !!updateData.newPassword
    });
    
    const userId = req.user.sub;
    
    const result = await this.authService.updateUserProfile(userId, updateData);
    
    if (!result.ok) {
      this.logger.error(`❌ [updateProfile] Update failed: ${result.msg}`);
      throw new BadRequestException(result.msg);
    }

    if (!result.user) {
      this.logger.error(`❌ [updateProfile] No user data returned`);
      throw new BadRequestException('Error al actualizar el perfil');
    }

    this.logger.log(`✅ [updateProfile] Profile updated for user: ${result.user.nick}`);
    
    return {
      ok: true,
      message: 'Perfil actualizado correctamente',
      user: result.user
    };
  }

  /**
   * GET /auth/countries
   * Get list of all countries
   * Public endpoint (no authentication required)
   */
  @Get('countries')
  async getCountries() {
    this.logger.log('📡 [getCountries] Request received');
    
    const countries = await this.authService.getCountries();
    
    this.logger.log(`✅ [getCountries] Returning ${countries.length} countries`);
    return countries;
  }
}