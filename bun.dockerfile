FROM oven/bun:1-alpine AS build

# The build needs no Shopware settings: NUXT_SHOPWARE_ENDPOINT and
# NUXT_SHOPWARE_ACCESS_TOKEN are runtime settings of the container.
ENV NODE_ENV=production
ENV BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

COPY --chown=bun:bun package.json bun.lock ./

USER bun

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production --ignore-scripts

COPY . .

RUN bun run build

FROM oven/bun:1-alpine AS dev

ENV BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

RUN chown -R bun:bun /app

USER bun

WORKDIR /app

COPY --chown=bun:bun package.json bun.lock ./

RUN bun install --frozen-lockfile --ignore-scripts

COPY --chown=bun:bun . .

EXPOSE 3000
EXPOSE 24678

CMD [ "bun", "run", "dev" ]

FROM oven/bun:1-alpine AS production

WORKDIR /app

COPY --from=build --chown=bun:bun /app/.output /app/.output

RUN chown -R bun:bun /app

USER bun

EXPOSE 3000

CMD [ "bun", ".output/server/index.mjs" ]