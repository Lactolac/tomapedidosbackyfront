# este docker sirve para levantar dos el backend y front end en un mismo si es express para que este todo bien

# Etapa 1: Construcción del frontend
FROM node:22.12.0-alpine AS build-stage

WORKDIR /app/frontend
COPY package*.json ./
RUN npm install
COPY . .

# Etapa 2: Imagen final con backend y frontend
FROM node:22.12.0-alpine

WORKDIR /app

# Backend
COPY ./backend/package*.json ./backend/
RUN npm install --prefix ./backend
COPY ./backend ./backend

# Frontend desde build-stage
COPY --from=build-stage /app/frontend ./frontend/

# Instala concurrently para correr ambos servidores
RUN npm install -g concurrently

EXPOSE 5173 3000

CMD ["concurrently", "\"cd /app/frontend && npm run dev -- --host 0.0.0.0 --port 5173\"", "\"cd /app/backend && node server.js\""]

