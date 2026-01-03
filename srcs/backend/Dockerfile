# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the API port
EXPOSE 3000

# Start the application in development mode
CMD ["npm", "run", "start:dev"]