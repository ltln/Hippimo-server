FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package*.json ./
RUN HUSKY=0 npm ci

FROM deps AS builder

COPY . .
RUN npm run db:generate
RUN npm run build

FROM deps AS production

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
RUN npm prune --omit=dev

CMD ["node", "dist/src/main.js"]
