FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsup.config.ts tsconfig.json ./
COPY src/ src/

RUN npm run build

FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ dist/

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
