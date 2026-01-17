FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
#RUN npm ci --only=production
RUN npm ci

COPY . .

# Recibimos el argumento del Compose
ARG PORT_ARG 

# Lo convertimos en variable de entorno interna para el contenedor
ENV PORT=$PORT_ARG

EXPOSE $PORT

# El flag --host es CRUCIAL en Docker para que el puerto sea accesible desde fuera
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]