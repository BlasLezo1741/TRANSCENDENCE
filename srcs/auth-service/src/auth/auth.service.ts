// Injectable - Decorador que marca esta clase como un servicio que puede ser inyectado en otros lugares
// Inject - Para inyectar dependencias (recursos que necesita este servicio)
// InternalServerErrorException - Para manejar errores del servidor (error 500)

import { 
  Injectable, 
  Inject, 
  InternalServerErrorException, 
  Logger                          // Importa Logger
} from '@nestjs/common';

// Importa el tipo de base de datos. Drizzle es un ORM 
// (Object-Relational Mapping), una herramienta que te permite hablar con la 
// base de datos usando JavaScript en lugar de SQL puro.
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { eq } from 'drizzle-orm';

// Importa el esquema de tu base de datos (las definiciones de tus tablas.
import * as schema from '../schema';

// Importa un DTO (Data Transfer Object). Es básicamente un objeto que define 
// qué datos esperas recibir del frontend (user, email, password).
import { RegisterUserDto } from '../dto/register-user.dto';

// HttpService - Para hacer peticiones HTTP a otros servicios (en este caso, 
// al microservicio Python)
// firstValueFrom - Convierte un Observable de RxJS en una Promise 
// (para usar await)
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// bcrypt - Librería para encriptar contraseñas de forma segura.
import * as bcrypt from 'bcryptjs';

// @Injectable() - Decorador dice "el servicio puede ser usado en otros lugares"
// Es una clase que contiene la lógica de autenticación
@Injectable()
export class AuthService {
  // El constructor recibe las "herramientas" que necesita:

  private readonly logger = new Logger(AuthService.name);

  // db - La conexión a la base de datos (inyectada con el nombre 'DRIZZLE_CONNECTION')
  // httpService - Para hacer peticiones HTTP

  constructor(
    // Inyectamos la instancia de Drizzle (configurada en database.module.ts)
    @Inject('DRIZZLE_CONNECTION')
    private db: NodePgDatabase<typeof schema>,
    private readonly httpService: HttpService,
  ) {}
  // async - Esta función es asíncrona (espera respuestas de la base de datos y 
  // otros servicios)
  // dto - Los datos que vienen del frontend (user, email, password)

  async register(dto: RegisterUserDto) {
    this.logger.log(`1. Iniciando registro para el usuario: ${dto.user}`);
    try {
      // 1. Encriptar la contraseña (Seguridad básica)
      // 
      //    **¿Por qué encriptar?**
      //    - **NUNCA** guardes contraseñas en texto plano en la base de datos
      //    - Si hackean tu DB, no podrán ver las contraseñas reales
      //
      //    **¿Qué hace?**
      //    - `genSalt()` - Genera un "salt" (datos aleatorios que se añaden a la contraseña)
      //    - `hash()` - Convierte "miPassword123" en algo como "$2b$10$abcd1234..."
      //
      //    **Ejemplo:**
      //    ```
      //    Password original: "hola123"
      //    Password hasheada: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
      this.logger.debug('2a. Intentando salt...');
      const salt = await bcrypt.genSalt();
      this.logger.debug('2b. Intentando hash...');
      const hashedPassword = await bcrypt.hash(dto.password, salt);
      this.logger.debug('2c. Generando clave totp...');
      const pythonUrlrandom = 'http://totp:8070/random'; 
      this.logger.debug('4. Llamando al servicio TOTP en Python...');         
      const { data: totprandom } = await firstValueFrom(
        this.httpService.get(pythonUrlrandom)
      );
      this.logger.debug(`2d. Clave aleatoria ${totprandom.totpkey}`);          

      // 2. Insertar el usuario en la tabla PLAYER 
      // Usamos los nombres de campos de tu tabla SQL: p_nick, p_mail, p_pass 
      // this.db.insert(schema.player) - "Inserta en la tabla player"
      // .values({ ... }) - "Con estos valores":
      //
      // p_nick - El nombre de usuario
      // p_mail - El email
      // p_pass - La contraseña encriptada
      // p_reg - Fecha de registro (fecha actual)
      // 
      // 
      // .returning() - "Devuélveme el registro que acabas de crear"
      // const [newUser] - Guarda el primer (y único) resultado en newUser
      // INSERT INTO player (p_nick, p_mail, p_pass, p_reg) 
      // VALUES ('juan', 'juan@email.com', '$2b$10$...', '2026-01-15')
      // RETURNING *;      
      this.logger.debug('2. Intentando insertar en DB...');

      const [newUser] = await this.db.insert(schema.player).values({
        pNick: dto.user,
        pMail: dto.email,
        pPass: hashedPassword,
        pReg: new Date().toISOString(),
      }).returning();
      this.logger.log(`3. Usuario insertado con ID: ${newUser.pPk}`);
      // 3. Llamar al microservicio totp (Python) 
      // Usamos el nombre del servicio definido en docker-compose

      // Petición POST a totp que está en http://totp:8000/generate
      // Le envía el ID y nombre del usuario recién creado
      // Etotp genera un código QR para autenticación de dos factores (2FA)
      // Guarda la respuesta en data

      // Nota: totp es el nombre del servicio en Docker Compose 
      // (los contenedores se comunican por nombre)


      const pythonUrl = 'http://totp:8070/generate'; 
      this.logger.debug('4. Llamando al servicio TOTP en Python...');         
      const { data: totpgenerate } = await firstValueFrom(
        this.httpService.post(pythonUrl, {
          user_id: newUser.pPk,
          user_nick: newUser.pNick
        })
      );
      this.logger.log('5. Respuesta recibida de Python con éxito'); 
      // 4. Actualizar el secreto TOTP en la DB (opcional, si Python devuelve el secreto)
      // Si Python devuelve un "secreto" (la clave para generar códigos 2FA)
      // Actualiza el registro del usuario en la base de datos
      // Guarda ese secreto en el campo p_totp_secret
      // Equivalente SQL:
      // sqlUPDATE player 
      // SET p_totp_secret = 'JBSWY3DPEHPK3PXP' 
      // WHERE pPk = 123;

      if (totprandom.totpkey) {
        await this.db.update(schema.player)
          .set({ pTotpSecret: totprandom.totpkey })
          .where(eq(schema.player.pPk, newUser.pPk));
      }

      // 5. Devolver al frontend los datos necesarios (como el QR)
      // Devuelve un objeto con:
      // + Un mensaje de éxito
      // + El ID del usuario
      // + El código QR (probablemente en base64) para que el frontend lo muestre
      const pythonqr = 'http://totp:8070/qrtext'; 

      let totpqr; // ← Declaración fuera del try

      try{
        const { data } = await firstValueFrom(
          this.httpService.post(pythonqr, {
            user_totp_secret: totprandom.totpkey,
            user_nick: dto.user,
            user_mail: dto.email
          }));
          totpqr = data
        this.logger.log(`6. Respuesta qr_text ${totpqr.qr_text}`);           
      } catch (error) {
        console.log('❌ Error 422 details:', error.response?.data);
        // Esto te dirá EXACTAMENTE qué campo está mal
        throw new InternalServerErrorException({
          message: 'Datos incorrectos',
          detail: error.message // Ojo: en producción no envíes detalles sensibles
        }); 
      }


      return {
        message: 'Usuario registrado con éxito',
        userId: newUser.pPk,
        qrCode: totpqr.qr_text, // El string base64 o URL que genera tu Python
      };


      // Si algo falla (DB caída, Python no responde, etc.):
      //
      // Imprime el error en consola
      // Lanza una excepción HTTP 500 con un mensaje amigable


    } catch (error) {
      console.error('Error en el registro:', error);
      this.logger.error(`❌ Error en el flujo: ${error.message}`, error.stack);  
      // Enviamos una respuesta clara al frontend
      throw new InternalServerErrorException({
        message: 'No se pudo completar el registro',
        detail: error.message // Ojo: en producción no envíes detalles sensibles
      });          
    }
  }
}

