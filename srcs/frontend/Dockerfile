# frontend/Dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm  npm ci

COPY . .

# Expose the Vite port
ARG FE_CONTAINER_PORT=5173
ENV PORT=${FE_CONTAINER_PORT}

EXPOSE ${PORT}

# Start Vite with --host to allow external access
CMD ["npm", "run", "dev", "--", "--host"]




