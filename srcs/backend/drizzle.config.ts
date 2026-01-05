import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Aquí le decimos dónde queremos que escriba el archivo generado
  schema: "./src/schema.ts", 
  out: "./drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    // Usamos 'dbserver' porque lo ejecutaremos desde dentro de Docker
    url: "postgres://postgres:example@dbserver:5432/transcendence",
  },
  // Esto hace que borre lo que había antes en schema.ts y ponga lo nuevo
  verbose: true,
  strict: true,
});