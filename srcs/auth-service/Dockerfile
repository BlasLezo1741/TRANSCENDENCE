FROM node:20-alpine

# Instalamos dependencias necesarias para compilar paquetes nativos (como bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos todas las dependencias (incluyendo devDependencies para nest cli)
RUN npm install

# Copiamos el resto del código
COPY . .

# Recibimos el argumento del Compose
ARG AUS_PORT 

# Lo convertimos en variable de entorno interna para el contenedor
ENV PORT=$AUS_PORT
# Exponemos el puerto de NestJS
EXPOSE $PORT


# Comando para desarrollo con hot-reload
CMD ["npm", "run", "dev"]