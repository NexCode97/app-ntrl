FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser  -S appuser -u 1001 -G appgroup

RUN apk add --no-cache curl tini

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup ./src ./src
COPY --chown=appuser:appgroup package.json ./

RUN mkdir -p /app/uploads /app/logs && \
    chown -R appuser:appgroup /app/uploads /app/logs

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
USER appuser
ENTRYPOINT ["tini", "--"]
CMD ["node", "src/server.js"]
