
FROM node:26-alpine AS build

ARG PNPM_VERSION=12.21.0
# The build needs no Shopware settings: NUXT_SHOPWARE_ENDPOINT and
# NUXT_SHOPWARE_ACCESS_TOKEN are runtime settings of the container.
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Node 25+ no longer bundles corepack
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy manifests first so dependency layer is cached independently from source changes.
# pnpm-workspace.yaml (settings, allowBuilds) is part of the lockfile contract; without it
# `--frozen-lockfile` fails. Copy patches/ as well if a pnpm patch is added again.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .

RUN pnpm build
# the behaviour tests' seam (SHOPBITE_TEST_SEAMS=1) never ships in an image
RUN if grep -rqs "/api/_test/" .output/server; then echo "test seams in a production build" >&2; exit 1; fi

FROM node:26-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN mkdir -p /app/.data && chown -R node:node /app

COPY --from=build --chown=node:node /app/.output /app/.output

USER node

EXPOSE 3000

CMD [ "node", "--trace-warnings", ".output/server/index.mjs" ]
