# BASE
FROM node:20-alpine AS base


# STEP 1 — BUILD SERVER
FROM base AS server-builder
WORKDIR /build/server

COPY server/package*.json ./
RUN npm install

COPY server/ .
RUN npm run build
# Resultado: /build/server/dist


# STEP 2 — BUILD CLIENT
FROM base AS client-builder
WORKDIR /build/client

COPY client/package*.json ./
RUN npm install

COPY client/ .
RUN npm run build
# Resultado: /build/client/dist


# STEP 3 — RUNTIME (FINAL IMAGE)
FROM node:20-alpine

WORKDIR /app

# SERVER → Copiar build + instalar prod deps
RUN mkdir -p server
COPY --from=server-builder /build/server/dist ./server/dist
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# CLIENT → Copiar build (somente dist)
RUN mkdir -p client
COPY --from=client-builder /build/client/dist ./client/dist

# Banco de dados
RUN mkdir -p db

EXPOSE 3333

CMD ["node", "server/dist/server.js"]
