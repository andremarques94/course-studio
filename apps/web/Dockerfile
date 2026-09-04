FROM node:24-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && corepack prepare pnpm@11.23.0 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

ARG VITE_API_URL
ARG VITE_COLLAB_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_COLLAB_URL=$VITE_COLLAB_URL

RUN test -n "$VITE_API_URL"
RUN test -n "$VITE_COLLAB_URL"

RUN pnpm --filter @course-studio/web... build


FROM build AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

USER node

CMD ["node", "apps/web/.output/server/index.mjs"]