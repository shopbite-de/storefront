
FROM node:24-alpine AS build

ARG PNPM_VERSION=10.26.2
ARG NUXT_PUBLIC_SHOPWARE_ENDPOINT='https://my.shop/store-api'
ARG NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN='TOKEN'

ENV PNPM_VERSION=${PNPM_VERSION}
ENV NUXT_PUBLIC_SHOPWARE_ENDPOINT=${NUXT_PUBLIC_SHOPWARE_ENDPOINT}
ENV NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN=${NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN}
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

RUN npm install -g pnpm@${PNPM_VERSION}

COPY . .

RUN pnpm install --frozen-lockfile --prefer-offline --production

RUN pnpm build

FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN mkdir -p /app/.data && chown -R node:node /app

COPY --from=build --chown=node:node /app/.output /app/.output

USER node

EXPOSE 3000

CMD [ "node", "--trace-warnings", ".output/server/index.mjs" ]