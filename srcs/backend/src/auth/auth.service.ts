// backend/src/auth/auth.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
// bcrypt - Librería para encriptar contraseñas de forma segura.
import * as bcrypt from 'bcryptjs';
import { users } from '../schema'; 
import { player } from '../schema'; 
import * as schema from '../schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database.module';
// Importa un DTO (Data Transfer Object). Es básicamente un objeto que define 
// qué datos esperas recibir del frontend (user, email, password).
import { RegisterUserDto } from '../dto/register-user.dto';

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
  ) {}

  async loginUser(username: string, plainPassword: string) {
    const result = await this.db.select().from(users).where(eq(users.pNick, username)).limit(1);
    const user = result[0];

    if (!user) return { ok: false, msg: "Usuario no encontrado" };

    const match = await bcrypt.compare(plainPassword, user.pPass || "");
    if (!match) return { ok: false, msg: "Contraseña incorrecta" };
    if (user.pStatus === 0) return { ok: false, msg: "Cuenta inactiva" };

    return { ok: true, msg: "Login correcto", user: { id: user.pPk, name: user.pNick } };
  }

  // AQUI ESTABA EL ERROR: Faltaba añadir 'country' en los argumentos
  async registerUser(username: string, password: string, email: string, birth: string, country: string, lang: string, enable2FA: boolean) {
    
    // 1. Verificamos si existe
    const existing = await this.db.select().from(users)
      .where(or(eq(users.pNick, username), eq(users.pMail, email))).limit(1);

    if (existing.length > 0) return { ok: false, msg: "Usuario o correo ya existe" };

    // 2. Encriptamos contraseña
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
    // 4. Insertamos en la base de datos (incluyendo pCountry)
    await this.db.insert(player).values({
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
      pTotpEnable: enable2FA,
      pTotpEnabledAt: now,
    });

    return { ok: true, msg: "Usuario registrado correctamente" };
  }
}