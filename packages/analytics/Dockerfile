# syntax=docker/dockerfile:1.4

# ---------- Base Builder Stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json yarn.lock ./
COPY packages/analytics/package.json ./packages/analytics/package.json

RUN --mount=type=cache,target=/root/.cache/yarn \
    YARN_CACHE_FOLDER=/root/.cache/yarn yarn install --frozen-lockfile --ignore-scripts

COPY . .

COPY packages/analytics ./packages/analytics

RUN yarn workspace analytics prisma generate
RUN yarn workspace analytics build


# ---------- Deps Stage ----------
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/analytics/package.json ./packages/analytics/package.json

RUN --mount=type=cache,target=/root/.cache/yarn \
    YARN_CACHE_FOLDER=/root/.cache/yarn yarn install --production --frozen-lockfile --ignore-scripts

# ---------- Production Stage ----------
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/analytics/dist ./dist
COPY --from=deps /app/packages/analytics/node_modules ./node_modules
COPY --from=builder /app/packages/analytics/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/analytics/node_modules/@prisma ./node_modules/@prisma

COPY packages/analytics/prisma ./prisma

ENV PORT=4000

EXPOSE 4000

# Start the app
CMD ["node", "dist/src/main.js"]
