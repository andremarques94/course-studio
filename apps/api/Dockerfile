FROM node:24-alpine AS build

RUN apk add --no-cache python3 make g++

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && corepack prepare pnpm@11.23.0 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @course-studio/api... build

RUN pnpm --filter @course-studio/api deploy \
    --prod \
    --legacy \
    /app/deploy


FROM node:24-alpine AS runtime

WORKDIR /app

# Production API and its production dependencies.
COPY --from=build /app/deploy .
COPY --from=build /app/packages/db/drizzle ./drizzle

# npm is not required at runtime (fix CVEs)
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

ENV NODE_ENV=production

EXPOSE 3001

USER node

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.API_PORT || process.env.PORT || 3001) + '/api/health/db').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

# Apply pending migrations before starting the API.
CMD ["sh", "-c", "node dist/migrate.js && exec node dist/index.js"]
