import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Delete,
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
//import { ChatGateway } from '../chat/chat.gateway';
import { GameGateway } from '../game.gateway';


@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    //private readonly chatGateway: ChatGateway
    private readonly gameGateway: GameGateway
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
  // Passport handles the redirect — nothing to do here
}

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(@Req() req, @Res() res: Response) {
  const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL')
                   || 'https://localhost:8443';

  // Recover termsAccepted from the state Passport echoes back
  let termsAccepted = false;
  try {
    const state = JSON.parse(
      Buffer.from(req.query.state as string, 'base64').toString('utf-8')
    );
    termsAccepted = state.termsAccepted === true;
  } catch { /* state absent or not JSON — treat as false */ }

  try {
    const existing = await this.authService.findOAuthUser(req.user);
    if (existing) {
      const { accessToken } = this.authService.generateJwtToken(existing);
      return res.redirect(`${frontendUrl}/?token=${accessToken}`);
    }
    const pendingToken = this.authService.generatePendingOAuthToken(req.user);
    const termsParam = termsAccepted ? '&termsAccepted=true' : '';
    res.redirect(`${frontendUrl}/?oauth_pending=${pendingToken}${termsParam}`);
  } catch (e: any) {
    const msg = encodeURIComponent(
      e?.status === 409 ? 'errors.userOrEmailExists' : 'errors.unknownError'
    );
    res.redirect(`${frontendUrl}/?oauth_error=${msg}`);
  }
}

// ==================== 42 SCHOOL OAUTH ====================

@Get('42')
@UseGuards(AuthGuard('42'))
async fortyTwoAuth(@Req() req) {
  // Passport handles the redirect — nothing to do here
}

@Get('42/callback')
@UseGuards(AuthGuard('42'))
async fortyTwoAuthRedirect(@Req() req, @Res() res: Response) {
  const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL')
                   || 'https://localhost:8443';

  let termsAccepted = false;
  try {
    const state = JSON.parse(
      Buffer.from(req.query.state as string, 'base64').toString('utf-8')
    );
    termsAccepted = state.termsAccepted === true;
  } catch { /* state absent or not JSON — treat as false */ }

  try {
    const existing = await this.authService.findOAuthUser(req.user);
    if (existing) {
      const { accessToken } = this.authService.generateJwtToken(existing);
      return res.redirect(`${frontendUrl}/?token=${accessToken}`);
    }
    const pendingToken = this.authService.generatePendingOAuthToken(req.user);
    const termsParam = termsAccepted ? '&termsAccepted=true' : '';
    res.redirect(`${frontendUrl}/?oauth_pending=${pendingToken}${termsParam}`);
  } catch (e: any) {
    const msg = encodeURIComponent(
      e?.status === 409 ? 'errors.userOrEmailExists' : 'errors.unknownError'
    );
    res.redirect(`${frontendUrl}/?oauth_error=${msg}`);
  }
}
  // ==================== OAUTH TERMS ACCEPTANCE ====================

  /**
   * POST /auth/oauth-complete
   * Called after a new OAuth user accepts the terms of service.
   * Verifies the pending token, creates the user, returns a real JWT.
   */
  @Post('oauth-complete')
  async oauthComplete(@Body() body: { pendingToken: string }) {
    const oauthData = this.authService.verifyPendingOAuthToken(body.pendingToken);
    if (!oauthData) {
      return { ok: false, msg: 'errors.invalidOrExpiredToken' };
    }

    try {
      const newUser = await this.authService.createOAuthUser(oauthData);
      const { accessToken } = this.authService.generateJwtToken(newUser);
      return { ok: true, token: accessToken };
    } catch (e: any) {
      if (e?.status === 409) {
        return { ok: false, msg: 'errors.userOrEmailExists' };
      }
      return { ok: false, msg: 'errors.unknownError' };
    }
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
    
    //Bloque para actualizar el avatar
    try {
      this.logger.log(`📢 [SOCKET] Emitting friend_update for user ${result.user.nick}`);
      
      this.gameGateway.server.emit('friend_update', {
        id: userId,
        name: result.user.nick,
        avatar: result.user.avatarUrl,
        status: 'online'
      });
    } catch (error: any) {
      this.logger.warn(`⚠️ [SOCKET] Failed to emit update: ${error.message}`);
    }

    this.logger.log(`✅ [updateProfile] Profile updated for user: ${result.user.nick}`);
    
    return {
      ok: true,
      message: 'Perfil actualizado correctamente',
      user: result.user
    };
  }
  /**
   * DELETE /auth/profile
   * Anonymize (soft-delete) current user's account
   * Requires JWT authentication
   */
  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req) {
    this.logger.log(`🗑️ [deleteAccount] Request from user ID: ${req.user.sub}`);
    
    const userId = req.user.sub;
    
    const result = await this.authService.anonymizeUser(userId);
    
    if (!result.ok) {
      this.logger.error(`❌ [deleteAccount] Anonymization failed: ${result.msg}`);
      throw new BadRequestException(result.msg);
    }

    this.logger.log(`✅ [deleteAccount] Account anonymized for user ID: ${userId}`);
    
    return {
      ok: true,
      message: 'Account deleted successfully'
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