# backend/Dockerfile
FROM node:24-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./

# --mount=type=cache persiste ~/.npm entre builds sin ocupar espacio en la imagen
# npm ci es más rápido que npm install: usa package-lock.json exactamente
RUN --mount=type=cache,target=/root/.npm npm ci

# Copying the rest of the code at end does not invalides dependencies' layer 
COPY . .

# Expose the API port
ARG BE_CONTAINER_PORT=3000
ENV PORT=${BE_CONTAINER_PORT}

EXPOSE ${PORT}

# Start the application in development mode
CMD ["npm", "run", "start:dev"]











