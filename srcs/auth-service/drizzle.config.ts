import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Aseguramos que cargue el .env correctamente
dotenv.config({ path: '../.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Usamos propiedades separadas para evitar el error de parseo de URL
    host: process.env.DB_HOST, 
    port: Number(process.env.DB_PORT),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'example',
    database: process.env.POSTGRES_DB || 'transcendence',
    ssl: false,
  },
});