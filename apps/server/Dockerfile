FROM node:22-alpine

LABEL org.opencontainers.image.source="https://github.com/71zone/envpush"

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/shared/ packages/shared/
COPY packages/db-pglite/ packages/db-pglite/
COPY apps/server/ apps/server/

RUN corepack enable && pnpm install --frozen-lockfile && pnpm build --filter=@envpush/server

ENV NODE_ENV=production
ENV PORT=8787
ENV EVPUSH_DATA_DIR=/app/data/envpush

EXPOSE 8787

CMD ["node", "apps/server/dist/index.js"]
