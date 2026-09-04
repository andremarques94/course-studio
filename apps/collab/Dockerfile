FROM node:24-alpine AS build
RUN apk add --no-cache python3 make g++
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable \
    && corepack prepare pnpm@11.23.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @course-studio/collab... build
RUN pnpm --filter @course-studio/collab... deploy --prod --legacy /app/deploy

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=build /app/deploy .
# npm ships in every official Node image but isn't needed at runtime
# it's the source of most of the flagged CVEs (tar, pacote, sigstore, etc.)
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
ENV NODE_ENV=production
ENV COLLAB_HOST=0.0.0.0
ENV COLLAB_PORT=3002
EXPOSE 3002
CMD ["node", "dist/index.js"]