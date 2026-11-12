# ---- build
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# npm ci butuh package-lock.json; fallback ke npm install kalau belum ada
RUN npm ci --omit=dev || npm install --omit=dev --no-audit --no-fund

# ---- runtime
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# wget dipakai healthcheck, sudah ada di busybox
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY views ./views
COPY db ./db
COPY package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
