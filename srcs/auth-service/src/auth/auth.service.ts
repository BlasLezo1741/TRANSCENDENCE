// Injectable - Decorador que marca esta clase como un servicio que puede ser inyectado en otros lugares
// Inject - Para inyectar dependencias (recursos que necesita este servicio)
// InternalServerErrorException - Para manejar errores del servidor (error 500)

import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { NodePdfDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema'; // Importamos el esquema que definiste [cite: 5, 6]
import { RegisterUserDto } from '../dto/register-user.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    // Inyectamos la instancia de Drizzle (configurada en database.module.ts) [cite: 5]
    @Inject('DRIZZLE_CONNECTION')
    private db: NodePdfDatabase<typeof schema>,
    private readonly httpService: HttpService,
  ) {}

  async register(dto: RegisterUserDto) {
    try {
      // 1. Encriptar la contraseña (Seguridad básica)
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      // 2. Insertar el usuario en la tabla PLAYER 
      // Usamos los nombres de campos de tu tabla SQL: p_nick, p_mail, p_pass 
      const [newUser] = await this.db.insert(schema.player).values({
        p_nick: dto.user,
        p_mail: dto.email,
        p_pass: hashedPassword,
        p_reg: new Date(),
      }).returning();

      // 3. Llamar al microservicio 2faserver (Python) 
      // Usamos el nombre del servicio definido en docker-compose
      const pythonUrl = 'http://totp:8000/generate'; 
      
      const { data } = await firstValueFrom(
        this.httpService.post(pythonUrl, {
          user_id: newUser.p_pk,
          user_nick: newUser.p_nick
        })
      );

      // 4. Actualizar el secreto TOTP en la DB (opcional, si Python devuelve el secreto)
      if (data.secret) {
        await this.db.update(schema.player)
          .set({ p_totp_secret: data.secret })
          .where(schema.player.p_pk.equals(newUser.p_pk));
      }

      // 5. Devolver al frontend los datos necesarios (como el QR)
      return {
        message: 'Usuario registrado con éxito',
        userId: newUser.p_pk,
        qrCode: data.qr_code, // El string base64 o URL que genera tu Python
      };

    } catch (error) {
      console.error('Error en el registro:', error);
      throw new InternalServerErrorException('No se pudo completar el registro');
    }
  }
}