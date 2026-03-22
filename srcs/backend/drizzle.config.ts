import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// // Aseguramos que cargue el .env correctamente
// dotenv.config({ path: '../.env' });

// 1. Intentamos cargar el .env de forma segura resolviendo la ruta
// process.cwd() es la carpeta desde donde se lanza el comando (suele ser /app en Docker o /backend en local)
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

// 2. CHIVATO: Imprimimos por consola para ver qué está leyendo realmente
console.log('--- DIAGNÓSTICO DRIZZLE ---');
console.log('Ruta buscada para el .env:', envPath);
console.log('Usuario de DB:', process.env.POSTGRES_USER);
// Imprimimos la longitud de la clave para no mostrarla en texto plano en los logs
console.log('Password leída (longitud):', process.env.POSTGRES_PASSWORD ? process.env.POSTGRES_PASSWORD.length : '¡INDEFINIDA!');
console.log('---------------------------');

// 3. Opcional: Lanzar un error duro si no hay contraseña, para que no use cosas raras
if (!process.env.POSTGRES_PASSWORD) {
  console.warn("⚠️ ALERTA: No se ha detectado POSTGRES_PASSWORD en el entorno. Drizzle podría fallar al conectar.");
}

export default defineConfig({
  dialect: 'postgresql',
  // Aquí le decimos dónde queremos que escriba el archivo generado
  schema: ["./src/schema.ts", "./src/relations.ts"],
  out: "./drizzle",
    dbCredentials: {
    // // Usamos propiedades separadas para evitar el error de parseo de URL
    // host: process.env.DB_IP || process.env.DB_HOST || 'localhost', 
    // port: Number(process.env.DB_PORT) || 5432,
    // user: process.env.POSTGRES_USER || 'postgres',
    // password: process.env.POSTGRES_PASSWORD || 'example',
    // database: process.env.POSTGRES_DB || 'transcendence',
    // ssl: false,
    // Si estás seguro de tu .env, puedes quitar los || 'loquesea'
    host: process.env.DB_IP || process.env.DB_HOST || 'dbserver', // En Docker, suele llamarse dbserver, no localhost
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.POSTGRES_USER!, // El "!" le dice a TypeScript: "Confía en mí, esto existe"
    password: process.env.POSTGRES_PASSWORD!,
    database: process.env.POSTGRES_DB!,
    ssl: false,
  },
  //Esto hace que borre lo que había antes en schema.ts y ponga lo nuevo
  verbose: true,
  strict: true,
});





