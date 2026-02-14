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
    
    const result = await this.authService.loginUser(body.username, body.password);
    
    if (result.ok && result.user) {
      
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
      
      return response;
    } else {
      return result;
    }
  }

  @Post('register')
  async register(@Body() body: any) {
    const result = await this.authService.registerUser(
      body.username, 
      body.password, 
      body.email, 
      body.birth, 
      body.country, 
      body.lang,
      body.enabled2FA || false
    );
    return result;
  }

  @Post('verify-totp')
  async verifyTotp(@Body() body: any) {
    
    const { userId, totpCode } = body;
    const result = await this.authService.verifyTOTP(userId, totpCode);

    if (result.ok) {
      
      // Generate JWT token for successful 2FA verification
      const user = await this.authService.findUserById(userId);
      if (user) {
        const { accessToken } = this.authService.generateJwtToken(user);
        const response = {
          ...result,
          token: accessToken
        };
        return response;
      }
    } else {
    }

    return result;
  }

  @Post('verify-backup')
  async verifyBackup(@Body() body: any) {
    
    const { userId, totpCode } = body;
    const result = await this.authService.verifyBackupCode(userId, totpCode);
    return result;
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
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
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
   
    const userId = req.user.sub;
    
    const result = await this.authService.updateUserProfile(userId, updateData);
    
    if (!result.ok) {
      throw new BadRequestException(result.msg);
    }

    if (!result.user) {
      throw new BadRequestException('Error al actualizar el perfil');
    }
    
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
    
    const countries = await this.authService.getCountries();
    
    return countries;
  }
}