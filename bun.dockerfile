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
# the behaviour tests' seam (SHOPBITE_TEST_SEAMS=1) never ships in an image
RUN if grep -rqs "/api/_test/" .output/server; then echo "test seams in a production build" >&2; exit 1; fi

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