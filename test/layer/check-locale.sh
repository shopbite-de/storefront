#!/bin/sh
# Checks the built example shop (pnpm nuxt build test/layer) in its locale:
#   test/layer/check-locale.sh de   the German build: an overridden message
#   test/layer/check-locale.sh nl   NUXT_SHOPBITE_LOCALE=nl: the shop's own
#                                   locale, English fallback, its own paths
# Starts the build on PORT (default 3006) with the memory backend.
set -eu
locale=$1
port=${PORT:-3006}
root=$(cd "$(dirname "$0")" && pwd)

NUXT_SHOP_BITE_BACKEND=memory \
  NUXT_VISITOR_SESSION_PASSWORD=layer-check-session-password-0123456789 \
  NUXT_PUBLIC_STORE_URL="http://localhost:$port" PORT=$port \
  node "$root/.output/server/index.mjs" >/dev/null 2>&1 &
pid=$!
trap 'kill $pid' EXIT
for _ in $(seq 1 30); do
  curl -sf "http://localhost:$port/" >/dev/null && break
  sleep 1
done

home=$(curl -sf "http://localhost:$port/")
status() { curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port$1"; }
fail() { echo "test/layer ($locale): $1" >&2; exit 1; }
has() { printf '%s' "$home" | grep -qF -- "$1" || fail "home page lacks $1"; }

case "$locale" in
  de)
    has 'lang="de"'
    has 'Direkt zum Inhalt' # the shop's override
    has 'Hauptnavigation'   # the storefront's German messages
    [ "$(status /suche)" = 200 ] || fail "/suche is not 200"
    ;;
  nl)
    has 'lang="nl"'
    has 'Naar de inhoud'  # the shop's own message
    has 'Main navigation' # English for what it does not translate
    [ "$(status /zoeken)" = 200 ] || fail "/zoeken is not 200"
    [ "$(status /suche)" = 404 ] || fail "/suche is not 404"
    ;;
  *) fail "unknown locale" ;;
esac
echo "test/layer ($locale): ok"
