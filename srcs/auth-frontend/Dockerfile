FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
#RUN npm ci --only=production
RUN npm ci

COPY . .

# Vite 7 usa el 5173 por defecto
EXPOSE 5173

# El flag --host es CRUCIAL en Docker para que el puerto sea accesible desde fuera
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]