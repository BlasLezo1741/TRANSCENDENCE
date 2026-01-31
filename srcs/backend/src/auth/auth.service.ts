import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, or, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { player, pLanguage } from '../schema'; 
import * as schema from '../schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database.module';
import { JwtPayload } from './strategies/jwt.strategy';
import { CompleteProfileDto } from './dto/complete-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

  // ==================== LANGUAGE VALIDATION ====================
  
  /**
   * Validate language against database
   * Returns language code if valid and supported, null otherwise
   */
  async validateLanguage(langCode: string | null): Promise<string | null> {
    if (!langCode) {
      console.log('[AuthService] No language code provided, returning null');
      return null;
    }

    try {
      const result = await this.db
        .select()
        .from(pLanguage)
        .where(
          and(
            eq(pLanguage.langPk, langCode),
            eq(pLanguage.langStatus, true), // Only supported languages
          ),
        )
        .limit(1);

      if (result.length > 0) {
        console.log(`[AuthService] Language '${langCode}' is valid and supported`);
        return langCode;
      } else {
        console.log(`[AuthService] Language '${langCode}' not found or not supported in database, returning null`);
        return null;
      }
    } catch (error) {
      console.error(`[AuthService] Error validating language '${langCode}':`, error);
      return null;
    }
  }

  // ==================== TRADITIONAL LOGIN ====================
  
  async loginUser(username: string, plainPassword: string) {
    const result = await this.db
      .select()
      .from(player)
      .where(eq(player.pNick, username))
      .limit(1);
    
    const user = result[0];
    
    if (!user) {
      return { ok: false, msg: "Usuario no encontrado" };
    }

    // Check if user is OAuth user (no password)
    if (!user.pPass) {
      return { ok: false, msg: "Por favor inicia sesión con tu proveedor OAuth (42 o Google)" };
    }

    const match = await bcrypt.compare(plainPassword, user.pPass);
    if (!match) {
      return { ok: false, msg: "Contraseña incorrecta" };
    }

    if (user.pStatus === 0) {
      return { ok: false, msg: "Cuenta inactiva" };
    }

    return { 
      ok: true, 
      msg: "Login correcto", 
      user: { 
        id: user.pPk, 
        name: user.pNick,
        email: user.pMail,
        avatarUrl: user.pAvatarUrl,
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
    lang: string
  ) {
    // 1. Check if user exists
    const existing = await this.db
      .select()
      .from(player)
      .where(or(eq(player.pNick, username), eq(player.pMail, email)))
      .limit(1);
    
    if (existing.length > 0) {
      return { ok: false, msg: "Usuario o correo ya existe" };
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert into database
    await this.db.insert(player).values({
      pNick: username,
      pMail: email,
      pPass: hashedPassword,
      pBir: birth,
      pCountry: country,
      pLang: lang,
      pReg: new Date(),//.toISOString(),
      pRole: 1,
      pStatus: 1,
      pProfileComplete: true, // Traditional registration completes profile immediately
    });

    return { ok: true, msg: "Usuario registrado correctamente" };
  }

  // ==================== OAUTH AUTHENTICATION ====================
  /**
   * Find or create OAuth user
   * Validates language against database, sets profile as incomplete
   */
  async findOrCreateOAuthUser(oauthData: {
    oauthId: string;
    oauthProvider: string;
    email: string;
    nick: string;
    avatarUrl?: string;
    language?: string | null;   // From browser or OAuth provider
    country?: string | null;    // From browser or OAuth provider
  }) {
    console.log(`[AuthService] Processing OAuth user:`, {
      provider: oauthData.oauthProvider,
      email: oauthData.email,
      nick: oauthData.nick,
      rawLanguage: oauthData.language,
      rawCountry: oauthData.country,
    });

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
      console.log(`[AuthService] Existing OAuth user found: ${existingUser[0].pNick}`);
      return existingUser[0];
    }

    // Check if email is already used
    const emailExists = await this.db
      .select()
      .from(player)
      .where(eq(player.pMail, oauthData.email))
      .limit(1);

    if (emailExists.length > 0) {
      throw new ConflictException('Email ya registrado con otra cuenta');
    }

    // Check if nick is already used
    let finalNick = oauthData.nick;
    const nickExists = await this.db
      .select()
      .from(player)
      .where(eq(player.pNick, oauthData.nick))
      .limit(1);

    if (nickExists.length > 0) {
      finalNick = `${oauthData.nick}_${Math.floor(Math.random() * 10000)}`;
      console.log(`[AuthService] Nick '${oauthData.nick}' taken, using '${finalNick}'`);
    }

    // Validate language against database
    const validatedLanguage = await this.validateLanguage(oauthData.language ?? null);

    console.log(`[AuthService] Creating new OAuth user:`, {
      nick: finalNick,
      language: validatedLanguage,
      country: oauthData.country,
      profileComplete: false,
    });

    // Create new user
    const newUser = await this.db
      .insert(player)
      .values({
        pNick: finalNick,
        pMail: oauthData.email,
        pOauthProvider: oauthData.oauthProvider,
        pOauthId: oauthData.oauthId,
        pAvatarUrl: oauthData.avatarUrl,
        pLang: validatedLanguage,           // Will be null if not supported
        pCountry: oauthData.country,        // Will be null if not available
        pProfileComplete: false,            // Always false for OAuth
        pRole: 1,
        pStatus: 1,
      })
      .returning();

    console.log(`[AuthService] New OAuth user created successfully: ${newUser[0].pNick}`);
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
}