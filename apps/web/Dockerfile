FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@9.15.9
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig ./packages/tsconfig
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sia/web build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global pnpm@9.15.9
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/web ./apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "@sia/web", "start"]
