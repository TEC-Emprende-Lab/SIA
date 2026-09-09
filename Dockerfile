# Build from the repository root: the UI imports visual/brand/logo.svg.
FROM node:24-bookworm-slim AS build
WORKDIR /app/visual/prototype
RUN npm install --global pnpm@9.15.9
COPY visual/prototype/package.json visual/prototype/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY visual/prototype/ ./
COPY visual/brand/logo.svg /app/visual/brand/logo.svg
RUN pnpm lint && pnpm test && pnpm build

FROM nginx:stable-alpine AS runtime
COPY deploy/coolify/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/visual/prototype/dist/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz && wget -q -O /dev/null http://127.0.0.1:8080/index.html || exit 1
