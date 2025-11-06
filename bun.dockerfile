FROM oven/bun:1-debian AS build

ARG NUXT_PUBLIC_SHOPWARE_ENDPOINT='https://my.shop/store-api'
ARG NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN='TOKEN'

ENV NUXT_PUBLIC_SHOPWARE_ENDPOINT=${NUXT_PUBLIC_SHOPWARE_ENDPOINT}
ENV NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN=${NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN}
ENV NODE_ENV=production
ENV BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production --ignore-scripts

COPY . .

RUN bun run build

FROM oven/bun:1-debian AS dev

ENV NODE_ENV=development
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

FROM oven/bun:1-debian AS production

WORKDIR /app

COPY --from=build --chown=bun:bun /app/.output /app/.output

RUN chown -R bun:bun /app

USER bun

EXPOSE 3000

CMD [ "bun", ".output/server/index.mjs" ]