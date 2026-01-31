// backend/src/auth/auth.service.ts

import { eq, or , and } from 'drizzle-orm';
// bcrypt - Librería para encriptar contraseñas de forma segura.
import { users } from '../schema'; 
import { Injectable, Inject, Logger , ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { player } from '../schema'; 
import * as schema from '../schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database.module';
// Importa un DTO (Data Transfer Object). Es básicamente un objeto que define 
// qué datos esperas recibir del frontend (user, email, password).
import { RegisterUserDto } from '../dto/register-user.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { CompleteProfileDto } from './dto/complete-profile.dto';

// HttpService - Para hacer peticiones HTTP a otros servicios (en este caso, 
// al microservicio Python)
// firstValueFrom - Convierte un Observable de RxJS en una Promise 
// (para usar await)
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// @Injectable() - Decorador dice "el servicio puede ser usado en otros lugares"
// Es una clase que contiene la lógica de autenticación
@Injectable()
export class AuthService {
  // El constructor recibe las "herramientas" que necesita:

  private readonly logger = new Logger(AuthService.name);

  // db - La conexión a la base de datos (inyectada con el nombre 'DRIZZLE_CONNECTION')
  // httpService - Para hacer peticiones HTTP

  constructor(
    @Inject(DRIZZLE) 
    private db: PostgresJsDatabase<typeof schema>,
    private readonly httpService: HttpService,
    private jwtService: JwtService,
  ) {}

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
      return { ok: false, msg: "Usuario o correo ya existe" };
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // 3. Si el usarios quiere 2fa lo creamos
    let totpsecret; // ← Declaración fuera del try
    if (enable2FA)
    {
      const pythonUrlrandom = 'http://totp:8070/random'; 
      this.logger.debug('4. Llamando al servicio TOTP en Python...');         
      const { data } = await firstValueFrom(
        this.httpService.get(pythonUrlrandom)
      );
      this.logger.debug(`2d. Clave aleatoria ${data.totpkey}`);  
      totpsecret = data.totpkey;
    }
    let now = new Date().toISOString();
    let enabled2FAat = enable2FA ? now : null;
    // 4. Insertamos en la base de datos (incluyendo pCountry)
    const [newUser] =await this.db.insert(player).values({
      pNick:       username,
      pMail:       email,
      pPass:       hashedPassword,
      pBir:        birth,
      pCountry:    country, // <--- Importante: Guardamos el país
      pLang:       lang,
      pReg:        now,
      pRole:       1,
      pStatus:     1,
      pTotpSecret: totpsecret,
      pTotpEnabled: enable2FA,
      pTotpEnabledAt: enabled2FAat,
      pProfileComplete: true, // Traditional registration completes profile immediately
    }).returning();

    //    return { ok: true, msg: "Usuario registrado correctamente" };

    this.logger.log(`3. Usuario insertado con ID: ${newUser.pPk}`);
    let totpqr; // ← Declaración fuera del try
    let backupCodesArray: string[] = []; // Inicializamos el array vacío
    if (enable2FA)
    {
      // 5. Llamamos al microservicio TOTP para generar el QR
      const pythonqr = 'http://totp:8070/qrtext';
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
        this.logger.error('Error al obtener el QR de TOTP:', error);
        return { ok: false, msg: "Error al generar el código 2FA" };
      }
      this.logger.log(`5. Respuesta recibida de Python con éxito ${totpqr.qr_text[0]}`);
      this.logger.log(`5. Códigos de respaldo generados: ${totpqr.qr_text[1]}`);
      // 6. Convertir el string de códigos separados por comas en un array
      backupCodesArray = String(totpqr.qr_text[1])
        .split(',')
        .map((code: string) => code.trim()); // trim() elimina espacios en blanco
  
      // 7. Actualizar el usuario con los backup codes
      await this.db
        .update(player)
        .set({ pTotpBackupCodes: backupCodesArray })
        .where(eq(player.pNick, newUser.pNick));
  
      this.logger.log(`6. Backup codes guardados en la base de datos`);
    } // if enable2FA

    // 6. Devolvemos al frontend los datos necesarios
    return { 
  ok: true, 
  msg: "Usuario registrado correctamente",
  qrCode: totpqr?.qr_text[0] || null,
  backupCodes: backupCodesArray  // ["200513", "589663", "815166", ...]  
    }
  } // registerUser

async verifyTOTP(
  userId: number, 
  totpCode: string) 
{
    // 1. Obtenemos el usuario
    const result = await this.db.select().from(users).where(eq(users.pPk, userId)).limit(1);
    const user = result[0];

    if (!user) return { ok: false, msg: "Usuario no encontrado" };
    if (!user.pTotpEnabled || !user.pTotpSecret) 
      return { ok: false, msg: "2FA no está habilitado para este usuario" };

    // 2. Llamamos al microservicio TOTP para verificar el código
    const pythonVerifyUrl = 'http://totp:8070/verify';
    this.logger.debug('Llamando al servicio TOTP en Python para verificar código...');         
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(pythonVerifyUrl, {
          user_totp_secret: user.pTotpSecret,
          totp_code: totpCode
        })
      );
      this.logger.debug(`Respuesta de verificación TOTP: ${data.valid}`);
      }   catch (error) { 
      this.logger.error('Error al verificar el código TOTP:', error);
      return { ok: false, msg: "Error al verificar el código 2FA" };
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
      throw new ConflictException('Email ya registrado con otra cuenta');
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

    const hasProfileInfo = oauthData.lang && oauthData.country;
    // Create new user
    const newUser = await this.db
      .insert(player)
      .values({
        pNick: finalNick,
        pMail: oauthData.email,
        pOauthProvider: oauthData.oauthProvider,
        pOauthId: oauthData.oauthId,
        pAvatarUrl: oauthData.avatarUrl,
        pLang: oauthData.lang || 'en',
        pCountry: oauthData.country || 'ES',
        pProfileComplete: !!hasProfileInfo,
        pReg: new Date(),
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

} // class AuthService