# syntax=docker/dockerfile:1
FROM node:20-slim

WORKDIR /app

# Install production dependencies first (layer-cached)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/
COPY db/  ./db/

EXPOSE 3000
CMD ["node", "src/server.js"]
