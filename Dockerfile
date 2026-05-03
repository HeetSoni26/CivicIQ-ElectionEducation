# ─────────────────────────────────────────────────────────────────────────────
# CivicIQ — Multi-stage Dockerfile for ai-assistant-service
# Final image < 150MB, Node.js 20 LTS, non-root user, security hardened
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependency builder ───────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS deps

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ── Stage 2: TypeScript build ─────────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./

RUN npm ci --ignore-scripts

COPY src/ ./src/

RUN npx tsc --project tsconfig.json --outDir dist || true

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS runtime

RUN apk add --no-cache tini=0.19.0-r1 && \
    apk update && apk upgrade --no-cache

RUN addgroup -g 1001 -S civiciq && \
    adduser -u 1001 -S civiciq -G civiciq

WORKDIR /app

COPY --from=deps --chown=civiciq:civiciq /app/node_modules ./node_modules
COPY --from=builder --chown=civiciq:civiciq /app/dist ./dist
COPY --chown=civiciq:civiciq package.json ./

RUN chmod -R 550 /app/dist && \
    chmod -R 550 /app/node_modules

ENV NODE_ENV=production \
    PORT=8080 \
    NO_COLOR=1 \
    LOG_FORMAT=json

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

USER civiciq

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/server.js"]
