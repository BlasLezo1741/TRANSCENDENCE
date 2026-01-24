import { Injectable, Inject } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { users } from '../schema'; 
import * as schema from '../schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database.module';

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

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
  async registerUser(username: string, password: string, email: string, birth: string, country: string, lang: string) {
    
    // 1. Verificamos si existe
    const existing = await this.db.select().from(users)
      .where(or(eq(users.pNick, username), eq(users.pMail, email))).limit(1);

    if (existing.length > 0) return { ok: false, msg: "Usuario o correo ya existe" };

    // 2. Encriptamos contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insertamos en la base de datos (incluyendo pCountry)
    await this.db.insert(users).values({
      pNick: username,
      pMail: email,
      pPass: hashedPassword,
      pBir: birth,
      pCountry: country, // <--- Importante: Guardamos el país
      pLang: lang,
      pReg: new Date().toISOString(),
      pRole: 1,
      pStatus: 1,
    });

    return { ok: true, msg: "Usuario registrado correctamente" };
  }
}