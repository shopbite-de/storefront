#!/bin/sh
# The Shopware backend of the behaviour tests: the public quickstart
# (github.com/shopbite-de/shopbite) without its storefront, so the
# storefront under test (this branch's build) runs in its place on :3001.
#
#   QUICKSTART_DIR=<clone of shopbite-de/shopbite> test/bdd/shopware-stack.sh up
#   pnpm test:bdd:shopware
#   test/bdd/shopware-stack.sh down
#
# Compose project BDD_PROJECT (default bdd). Compose file and setup are
# copied to .bdd-stack/, so the setup writes its files there and not into
# the quickstart clone; .bdd-stack/storefront.env then holds the storefront's
# settings (read by playwright.config.ts for NUXT_SHOP_BITE_BACKEND=shopware).
# Images: SHOPWARE_IMAGE (default ghcr.io/shopbite-de/shopbite-shopware:latest).
# The quickstart publishes the fixed ports 8000, 3000 and 8025 on 127.0.0.1.
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)
stack="$root/.bdd-stack"
project=${BDD_PROJECT:-bdd}
compose() { docker compose -p "$project" -f "$stack/compose.yaml" "$@"; }

case "${1:-}" in
  up)
    quickstart=${QUICKSTART_DIR:?set QUICKSTART_DIR to a clone of github.com/shopbite-de/shopbite}
    rm -rf "$stack"
    mkdir -p "$stack/storefront"
    cp "$quickstart/compose.yaml" "$stack/"
    cp -R "$quickstart/setup" "$stack/setup"
    compose up -d --wait database valkey shopware mailpit worker scheduler
    # seeds the sales channel, opening hours and the demo menu, then exits
    compose up --no-deps --exit-code-from setup setup
    secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
    {
      grep -E '^NUXT_(SHOPWARE_ACCESS_TOKEN|PUBLIC_SITE_COUNTRY_ID|PUBLIC_SHOP_BITE_MENU_CATEGORY_ID)=' "$stack/storefront/.env"
      echo "NUXT_SHOPWARE_ENDPOINT=http://localhost:8000/store-api"
      # :3001 is the second domain the setup gives the sales channel
      echo "PORT=3001"
      echo "NUXT_PUBLIC_STORE_URL=http://localhost:3001"
      echo "NUXT_VISITOR_SESSION_PASSWORD=bdd-shopware-session-password-$secret"
      echo "NUXT_CACHE_PURGE_SECRET=$secret"
      echo "NUXT_SITE_INDEXABLE=false"
    } > "$stack/storefront.env"
    echo "Shopware is up; settings in $stack/storefront.env"
    ;;
  logs)
    compose logs --no-color
    ;;
  down)
    if [ -f "$stack/compose.yaml" ]; then compose down -v --remove-orphans; fi
    rm -rf "$stack"
    ;;
  *)
    echo "usage: $0 up|logs|down" >&2
    exit 2
    ;;
esac
