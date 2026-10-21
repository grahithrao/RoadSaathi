FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/worker/ ./apps/worker/
COPY apps/web/ ./apps/web/
COPY apps/mobile/ ./apps/mobile/

RUN npm install
RUN npm run build --workspace=packages/contracts
RUN cd apps/worker && npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

CMD ["node", "apps/worker/dist/index.js"]
