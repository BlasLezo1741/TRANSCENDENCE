// backend/src/auth/auth.service.ts

import { eq, or , and, sql, arrayContains } from 'drizzle-orm';
// bcrypt - Library to encrypt passwords securely

import { Injectable, Inject, Logger , ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; 
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { users } from '../schema';
import { player } from '../schema';
import { country } from '../schema';
import * as schema from '../schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database.module';
// Import a DTO (Data Transfer Object). It's basically an object that defines 
// what data you expect to receive from the frontend(user, email, password).
import { RegisterUserDto } from '../dto/register-user.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { CompleteProfileDto } from './dto/complete-profile.dto';

// HttpService - To make HTTP requests to other services (Python Microservice)
// firstValueFrom - Converts an RxJS Observable to a Promise (para usar await)
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// @Injectable() - Decorator says 'the service can be used in other places'
// It's a class that contains the authentication logic
@Injectable()
export class AuthService {
  // The constructor receives the 'tools' it needs

  private readonly logger = new Logger(AuthService.name);

  // db - The database connection (inyectada con el nombre 'DRIZZLE_CONNECTION')


  constructor(
    @Inject(DRIZZLE) 
    private db: PostgresJsDatabase<typeof schema>,
    private readonly httpService: HttpService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== TRADITIONAL LOGIN ====================
  
  async loginUser(username: string, plainPassword: string) {

    const result = await this.db
      .select({
        pNick: player.pNick,
        pPass: player.pPass,
        pPk: player.pPk,
        pMail: player.pMail,
        pAvatarUrl: player.pAvatarUrl,
        pTotpEnabled: player.pTotpEnabled,
        pStatus: player.pStatus,})
      .from(player)
      .where(eq(player.pNick, username))
      .limit(1);
    
    const user = result[0];
    
    if (!user) {
      return { ok: false, msg: "errors.userNotFound" };
    }

    // Check if user is OAuth user (no password)
    if (!user.pPass) {
      return { ok: false, msg: "errors.useOAuthProvider" };
    }

    const match = await bcrypt.compare(plainPassword, user.pPass);
    if (!match) {
      return { ok: false, msg: "errors.incorrectPassword" };
    }

       if (user.pStatus === 0) {
      return { ok: false, msg: "errors.inactiveAccount" };
    }

    return { 
      ok: true, 
      msg: "success.login", 
      user: { 
        id: user.pPk, 
        name: user.pNick,
        email: user.pMail,
        avatarUrl: user.pAvatarUrl,
        totp: user.pTotpEnabled 
      } 
    };
  }

  // ==================== TRADITIONAL REGISTRATION ====================
  
  async registerUser(
    username: string, 
    password: string, 
    email: string, 
    birth: string, 
    country: string, 
    lang: string, 
    enable2FA: boolean)
  {
    // 1. Check if user exists
    const existing = await this.db
      .select()
      .from(player)
      .where(or(eq(player.pNick, username), eq(player.pMail, email)))
      .limit(1);
    
    if (existing.length > 0) {
      return { ok: false, msg: "errors.userOrEmailExists" };
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // 3. If the user wants 2FA we create it
    let totpsecret;
    if (enable2FA)
    {
      const totpServiceUrl = this.configService.get<string>('TOTP_SERVICE_URL') || 'http://totp:8070';
      //const pythonUrlrandom = 'http://totp:8070/random';   
      const pythonUrlrandom = `${totpServiceUrl}/random`    
      const { data } = await firstValueFrom(
        this.httpService.get(pythonUrlrandom)
      );
      totpsecret = data.totpkey;
    }
    let now = new Date().toISOString();
    let enabled2FAat = enable2FA ? now : null;
    // 4. We insert into the database (including pCountry)
    const [newUser] =await this.db.insert(player).values({
      pNick:       username,
      pMail:       email,
      pPass:       hashedPassword,
      pBir:        birth,
      pCountry:    country, // Important: We save the country
      pLang:       lang,
      pReg:        now,
      pRole:       1,
      pStatus:     1,
      pTotpSecret: totpsecret,
      pTotpEnabled: enable2FA,
      pTotpEnabledAt: enabled2FAat,
      pProfileComplete: true, // Traditional registration completes profile immediately
    }).returning();

    let totpqr;
    let backupCodesArray: string[] = []; // We initialize the empty array
    let backupCodesEncryptedArray: string[] = []; // We initialize the empty array
    if (enable2FA)
    {
      // 5. We call the TOTP microservice to generate the QR

      const totpServiceUrl = this.configService.get<string>('TOTP_SERVICE_URL') || 'http://totp:8070';
      //const pythonqr = 'http://totp:8070/qrtext'; 
      const pythonqr = `${totpServiceUrl}/qrtext`    
      this.logger.debug('4. Llamando al servicio TOTP en Python...');
      try{
        const { data } = await firstValueFrom(
          this.httpService.post(pythonqr, {
            user_totp_secret: totpsecret,
            user_nick: username,
            user_mail: email
          })
        );
        totpqr = data ? data : null;
      } catch (error) {
        return { ok: false, msg: "Error generating the 2FA code" };
      }
      // 6. Convert the comma-separated codes string into an array
      backupCodesArray = String(totpqr.qr_text[1][0])
        .split(',')
        .map((code: string) => code.trim()); // trim() removes whitespace
      backupCodesEncryptedArray = String(totpqr.qr_text[1][1])
        .split(',')
        .map((code: string) => code.trim()); // trim() removes whitespace
      this.logger.debug(`5. ${backupCodesArray}` );
      this.logger.debug(`6. ${backupCodesEncryptedArray}`);
      // 7. Update the user with the backup codes
      await this.db
        .update(player)
        .set({ pTotpBackupCodes: backupCodesEncryptedArray })
        .where(eq(player.pNick, newUser.pNick));
    } // if enable2FA

    // 8. We return the necessary data to the frontend
    return { 
  ok: true, 
  msg: "success.userRegistered",
  qrCode: totpqr?.qr_text[0] || null,
  backupCodes: backupCodesArray  // ["200513", "589663", "815166", ...]  
    }
  } // registerUser

async verifyTOTP(
  userId: number, 
  totpCode: string) 
{
    // 1. We get the user
    const result = await this.db.select().from(users).where(eq(users.pPk, userId)).limit(1);
    const user = result[0];

    if (!user) return { ok: false, msg: "User not found" };
    if (!user.pTotpEnabled || !user.pTotpSecret) 
      return { ok: false, msg: "2FA is not enabled for this user" };

    // 2. Convert Buffer to string (it's a Base32 string)
    let totpSecret: string;
    if (Buffer.isBuffer(user.pTotpSecret)) {
      totpSecret = user.pTotpSecret.toString('utf-8');
    } else {
      totpSecret = user.pTotpSecret;
    }

    // 2. Calling the TOTP service in Python to verify code...
    const totpServiceUrl = this.configService.get<string>('TOTP_SERVICE_URL') || 'http://totp:8070';
    // const pythonVerifyUrl = 'http://totp:8070/verify';
    const pythonVerifyUrl = `${totpServiceUrl}/verify`    

       
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(pythonVerifyUrl, {
          user_totp_secret: totpSecret,
          totp_code: totpCode
        })
      );
      if (data.status === 'ok') {
        return { ok: true, msg: "Correcta validación del código 2FA" };
      } else {
        return { ok: false, msg: "Código 2FA inválido" };
      }
    }catch (error) { 
      return { ok: false, msg: "Error verifying the 2FA code" };
    }
  }

async verifyBackupCode(
  userId: number, 
  totpBackupCode: string) 
{
    // hay que encriptar en totp el backup code en abierto
    // 2. Calling the TOTP service in Python to verify code...
    const totpServiceUrl = this.configService.get<string>('TOTP_SERVICE_URL') || 'http://totp:8070';
    // const pythonEncryptUrl = 'http://totp:8070/encrypt';
    const pythonEncryptUrl = `${totpServiceUrl}/encrypt`;
      try {
        const { data } = await firstValueFrom(
          this.httpService.post(pythonEncryptUrl, {
            totp_backup_code: totpBackupCode
          })
        );
        if (data.status === 'ok') {
          const result = await this.db.update(player)
            .set({
              // We remove the code from the array
              pTotpBackupCodes: sql`array_remove(${player.pTotpBackupCodes}, ${data.encrypted_backup_code})`,
            })
            .where(
              and(
                eq(player.pPk, userId),
                // We only proceed if the code is present in the array
                sql`${player.pTotpBackupCodes} @> ARRAY[${data.encrypted_backup_code}]`
              )
            )
            .returning({
              updatedNick: player.pNick,
            });

          if (result.length === 0) {     
            return { ok: false, msg: "Invalid or already used backup code" };
          } else {
            const result = await this.db.select({
            // We use sql<number> to tell TS that the result is a number
            codesLeft: sql<number>`cardinality(${player.pTotpBackupCodes})`,
            })
            .from(player)
            .where(eq(player.pPk, userId));
            return { ok: true, msg: `The user has ${result[0].codesLeft} codes remaining after correct backup code validation` };
          } ;

      } else {
        return { ok: false, msg: "totp_server does not encrypt backup code" };
      }
    }catch (error) { 
      return { ok: false, msg: "Error verifying the 2FA backup code" };
    }





   
}
  
  


  // ==================== OAUTH AUTHENTICATION ====================
  
  // Find or create OAuth user
  async findOrCreateOAuthUser(oauthData: {
    oauthId: string;
    oauthProvider: string;
    email: string;
    nick: string;
    avatarUrl?: string;
    lang?: string;
    country?: string;
  }) {
    // Check if user exists by OAuth ID
    const existingUser = await this.db
      .select()
      .from(player)
      .where(
        and(
          eq(player.pOauthProvider, oauthData.oauthProvider),
          eq(player.pOauthId, oauthData.oauthId),
        ),
      )
      .limit(1);

    if (existingUser.length > 0) {
      return existingUser[0];
    }

    // Check if email is already used
    const emailExists = await this.db
      .select()
      .from(player)
      .where(eq(player.pMail, oauthData.email))
      .limit(1);

    if (emailExists.length > 0) {
      throw new ConflictException('Email already registered in other account');
    }

    // Check if nick is already used, if so, append random number
    let finalNick = oauthData.nick;
    const nickExists = await this.db
      .select()
      .from(player)
      .where(eq(player.pNick, oauthData.nick))
      .limit(1);

    if (nickExists.length > 0) {
      finalNick = `${oauthData.nick}_${Math.floor(Math.random() * 10000)}`;
    }

    //const hasProfileInfo = oauthData.lang && oauthData.country;
    // Create new user
    let now = new Date().toISOString();
    const newUser = await this.db
      .insert(player)
      .values({
        pNick: finalNick,
        pMail: oauthData.email,
        pTotpSecret: null,
        pTotpEnabled: false,
        pTotpEnabledAt: null,
        pTotpBackupCodes: [],
        pOauthProvider: oauthData.oauthProvider,
        pOauthId: oauthData.oauthId,
        pAvatarUrl: oauthData.avatarUrl,
        pLang: oauthData.lang || 'ca',
        pCountry: oauthData.country || 'FR',
        pProfileComplete: false,
        pReg: now,
        pRole: 1,
        pStatus: 1,
      })
      .returning();

    return newUser[0];
  }

  // ==================== PROFILE COMPLETION ====================
  
  // Complete user profile (country & language)
  async completeProfile(userId: number, profileData: CompleteProfileDto) {
    const updated = await this.db
      .update(player)
      .set({
        pCountry: profileData.country,
        pLang: profileData.language,
        pProfileComplete: true,
      })
      .where(eq(player.pPk, userId))
      .returning();

    return updated[0];
  }

  // ==================== JWT TOKEN GENERATION ====================
  
  // Generate JWT token
  generateJwtToken(user: any) {
    const payload: JwtPayload = {
      sub: user.pPk,
      email: user.pMail,
      nick: user.pNick,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  // Generate temporary token for profile completion
  generateTempToken(user: any) {
    const payload = {
      sub: user.pPk,
      temp: true,
    };

    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  // ==================== USER UTILITIES ====================
  
  // Validate user credentials (for traditional login)
  async validateUser(nick: string, password: string) {
    const user = await this.db
      .select()
      .from(player)
      .where(eq(player.pNick, nick))
      .limit(1);

    if (user.length === 0) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const foundUser = user[0];

    // Check if user is OAuth user (no password)
    if (!foundUser.pPass) {
      throw new UnauthorizedException('Por favor inicia sesión con tu proveedor OAuth');
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.pPass);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return foundUser;
  }

  // Find user by ID
  async findUserById(id: number) {
    const user = await this.db
      .select()
      .from(player)
      .where(eq(player.pPk, id))
      .limit(1);

    return user.length > 0 ? user[0] : null;
  }

  // ==================== COUNTRY MAPPING ====================
  
  // Map country name to country code from database
  async getCountryCode(countryName: string): Promise<string> {
    try {
      if (!countryName) {
        return 'FR';
      }

      // Case-insensitive search in the country table
      const result = await this.db
        .select({ code: country.coun2Pk })
        .from(country)
        .where(sql`LOWER(${country.counName}) = LOWER(${countryName})`)
        .limit(1);

      // Return the code if found, otherwise default to 'FR'
      const countryCode = result.length > 0 ? result[0].code : 'FR';
      this.logger.debug(`Country mapping: ${countryName} -> ${countryCode}`);
      return countryCode;
    } catch (error) {
      this.logger.error('Error fetching country code:', error);
      return 'FR'; // Default to FR on error
    }
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get all countries from database
   */
  async getCountries() {
    this.logger.log('📡 [getCountries] Fetching countries from database...');
    
    try {
      const result = await this.db
        .select({
          coun2_pk: country.coun2Pk,
          coun_name: country.counName,
        })
        .from(country)
        .orderBy(country.counName);

      this.logger.log(`✅ [getCountries] Found ${result.length} countries`);
      return result;
    } catch (error) {
      this.logger.error('❌ [getCountries] Error fetching countries:', error);
      return [];
    }
  }

  /**
   * Update user profile with validation
   */
  async updateUserProfile(userId: number, updateData: {
    nick?: string;
    email?: string;
    birth?: string;
    country?: string;
    lang?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    this.logger.log(`📡 [updateUserProfile] Updating user ${userId}`);
    this.logger.debug(`📝 [updateUserProfile] Update data:`, updateData);

    try {
      // 1. Get current user
      const currentUser = await this.findUserById(userId);
      if (!currentUser) {
        this.logger.error(`❌ [updateUserProfile] User not found: ${userId}`);
        return { ok: false, msg: 'Usuario no encontrado' };
      }

      this.logger.log(`✅ [updateUserProfile] Current user found: ${currentUser.pNick}`);

      // 2. Check if trying to change to existing nick
      if (updateData.nick && updateData.nick !== currentUser.pNick) {
        this.logger.log(`🔍 [updateUserProfile] Checking if nick '${updateData.nick}' is available...`);
        
        const nickExists = await this.db
          .select()
          .from(player)
          .where(
            and(
              eq(player.pNick, updateData.nick),
              sql`${player.pPk} != ${userId}`
            )
          )
          .limit(1);

        if (nickExists.length > 0) {
          this.logger.warn(`⚠️ [updateUserProfile] Nick already exists: ${updateData.nick}`);
          return { ok: false, msg: 'Ese nombre de usuario ya está en uso' };
        }
        
        this.logger.log(`✅ [updateUserProfile] Nick is available`);
      }

      // 3. Check if trying to change to existing email
      if (updateData.email && updateData.email !== currentUser.pMail) {
        this.logger.log(`🔍 [updateUserProfile] Checking if email '${updateData.email}' is available...`);
        
        const emailExists = await this.db
          .select()
          .from(player)
          .where(
            and(
              eq(player.pMail, updateData.email),
              sql`${player.pPk} != ${userId}`
            )
          )
          .limit(1);

        if (emailExists.length > 0) {
          this.logger.warn(`⚠️ [updateUserProfile] Email already exists: ${updateData.email}`);
          return { ok: false, msg: 'Ese email ya está en uso' };
        }
        
        this.logger.log(`✅ [updateUserProfile] Email is available`);
      }

      // 4. Prepare update data
      const dataToUpdate: any = {};

      if (updateData.nick) {
        dataToUpdate.pNick = updateData.nick;
        this.logger.log(`📝 [updateUserProfile] Will update nick to: ${updateData.nick}`);
      }
      if (updateData.email) {
        dataToUpdate.pMail = updateData.email;
        this.logger.log(`📝 [updateUserProfile] Will update email to: ${updateData.email}`);
      }
      if (updateData.birth) {
        dataToUpdate.pBir = updateData.birth;
        this.logger.log(`📝 [updateUserProfile] Will update birth to: ${updateData.birth}`);
      }
      if (updateData.country) {
        dataToUpdate.pCountry = updateData.country;
        this.logger.log(`📝 [updateUserProfile] Will update country to: ${updateData.country}`);
      }
      if (updateData.lang) {
        dataToUpdate.pLang = updateData.lang;
        this.logger.log(`📝 [updateUserProfile] Will update lang to: ${updateData.lang}`);
      }
      if (updateData.avatarUrl !== undefined) {
        dataToUpdate.pAvatarUrl = updateData.avatarUrl;
        this.logger.log(`📝 [updateUserProfile] Will update avatarUrl to: ${updateData.avatarUrl}`);
      }

      // 5. Handle password change (only for non-OAuth users)
      if (updateData.newPassword) {
        this.logger.log(`🔐 [updateUserProfile] Password change requested`);
        
        // Check if user has a password (not OAuth)
        if (!currentUser.pPass) {
          this.logger.warn(`⚠️ [updateUserProfile] User is OAuth, cannot change password`);
          return { 
            ok: false, 
            msg: 'No puedes cambiar la contraseña de una cuenta OAuth' 
          };
        }

        // Verify current password
        this.logger.log(`🔍 [updateUserProfile] Verifying current password...`);
        const isCurrentPasswordValid = await bcrypt.compare(
          updateData.currentPassword || '',
          currentUser.pPass
        );

        if (!isCurrentPasswordValid) {
          this.logger.warn(`⚠️ [updateUserProfile] Current password is incorrect`);
          return { ok: false, msg: 'Contraseña actual incorrecta' };
        }

        this.logger.log(`✅ [updateUserProfile] Current password verified`);

        // Hash new password
        this.logger.log(`🔐 [updateUserProfile] Hashing new password...`);
        const hashedNewPassword = await bcrypt.hash(updateData.newPassword, 10);
        dataToUpdate.pPass = hashedNewPassword;
        
        this.logger.log(`✅ [updateUserProfile] New password hashed`);
      }

      // 6. Update database
      this.logger.log(`💾 [updateUserProfile] Updating database...`);
      
      const [updatedUser] = await this.db
        .update(player)
        .set(dataToUpdate)
        .where(eq(player.pPk, userId))
        .returning();

      this.logger.log(`✅ [updateUserProfile] User ${userId} (${updatedUser.pNick}) updated successfully`);

      return {
        ok: true,
        msg: 'Perfil actualizado',
        user: {
          id: updatedUser.pPk,
          nick: updatedUser.pNick,
          email: updatedUser.pMail,
          birth: updatedUser.pBir,
          country: updatedUser.pCountry,
          lang: updatedUser.pLang,
          avatarUrl: updatedUser.pAvatarUrl,
        }
      };

    } catch (error) {
      this.logger.error('❌ [updateUserProfile] Error updating user profile:', error);
      return { ok: false, msg: 'Error al actualizar el perfil' };
    }
  }

  // ==================== ACCOUNT DELETION (ANONYMIZATION) ====================

  /**
   * Anonymize a user account by calling the PostgreSQL function
   */
  async anonymizeUser(userId: number): Promise<{ ok: boolean; msg: string }> {
    this.logger.log(`🗑️ [anonymizeUser] Anonymizing user ${userId}...`);

    try {
      // Verify user exists first
      const currentUser = await this.findUserById(userId);
      if (!currentUser) {
        this.logger.error(`❌ [anonymizeUser] User not found: ${userId}`);
        return { ok: false, msg: 'Usuario no encontrado' };
      }

      this.logger.log(`🗑️ [anonymizeUser] Found user: ${currentUser.pNick}, proceeding...`);

      // Call the PostgreSQL function
      await this.db.execute(sql`SELECT anonymize_player_by_id(${userId})`);

      this.logger.log(`✅ [anonymizeUser] User ${userId} anonymized successfully`);
      return { ok: true, msg: 'Account deleted successfully' };
    } catch (error) {
      this.logger.error('❌ [anonymizeUser] Error anonymizing user:', error);
      return { ok: false, msg: 'Error al eliminar la cuenta' };
    }
  }

} // class AuthService