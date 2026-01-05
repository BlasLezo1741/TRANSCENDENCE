import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';//tablas
import * as relations from './relations';//relaciones

export const DRIZZLE = 'DRIZZLE';

@Global() // Lo hacemos global para usarlo en cualquier parte sin importar de nuevo
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        // Usamos los datos de tu .env
        const queryClient = postgres('postgres://postgres:example@dbserver:5432/transcendence');
        return drizzle(queryClient, { schema: { ...schema, ...relations } });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}