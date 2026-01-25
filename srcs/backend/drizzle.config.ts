import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Aseguramos que cargue el .env correctamente
dotenv.config({ path: '../.env' });


export default defineConfig({
  dialect: 'postgresql',
  // Aquí le decimos dónde queremos que escriba el archivo generado
  schema: ["./src/schema.ts", "./src/relations.ts"],
  out: "./drizzle",
    dbCredentials: {
    // Usamos propiedades separadas para evitar el error de parseo de URL
    host: process.env.DB_IP || process.env.DB_HOST || 'localhost', 
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'example',
    database: process.env.POSTGRES_DB || 'transcendence',
    ssl: false,
  },
  //Esto hace que borre lo que había antes en schema.ts y ponga lo nuevo
  verbose: true,
  strict: true,
});





