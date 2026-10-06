# Build from the repository root: the UI imports visual/brand/logo.svg.
FROM node:24-bookworm-slim AS build
WORKDIR /app/visual/prototype
RUN npm install --global pnpm@9.15.9
COPY visual/prototype/package.json visual/prototype/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY visual/prototype/ ./
COPY visual/brand/logo.svg /app/visual/brand/logo.svg
RUN pnpm lint && pnpm test && pnpm build

FROM node:24-bookworm-slim AS web-build
WORKDIR /app
RUN npm install --global pnpm@9.15.9
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig ./packages/tsconfig
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
COPY visual/prototype/src/catalitec.css ./visual/prototype/src/catalitec.css
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sia/web build

FROM node:24-bookworm-slim AS web-runtime
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global pnpm@9.15.9
COPY --from=web-build /app/package.json ./package.json
COPY --from=web-build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=web-build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=web-build /app/node_modules ./node_modules
COPY --from=web-build /app/packages ./packages
COPY --from=web-build /app/apps/web ./apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "@sia/web", "start"]

FROM nginx:stable-alpine AS prototype-runtime
COPY deploy/coolify/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/visual/prototype/dist/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz && wget -q -O /dev/null http://127.0.0.1:8080/index.html || exit 1
