# ── Stage 1: base ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# ── Stage 2: deps ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY libs/shared-kernel/package.json libs/shared-kernel/
COPY libs/config/package.json libs/config/
COPY libs/api-contracts/package.json libs/api-contracts/
COPY libs/testing/package.json libs/testing/
RUN pnpm install --frozen-lockfile

# ── Stage 3: build ─────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm exec nx build worker --prod

# ── Stage 4: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS prod
RUN npm install -g pnpm@9
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nodeuser

COPY --from=build /app/dist/apps/worker ./dist/apps/worker
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

USER nodeuser

CMD ["node", "dist/apps/worker/main.js"]
