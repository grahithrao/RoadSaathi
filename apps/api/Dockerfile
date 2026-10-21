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
RUN cd apps/api && npx prisma generate && npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
