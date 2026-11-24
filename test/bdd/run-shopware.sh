#!/bin/sh
# One command for the behaviour tests against Shopware: starts the
# quickstart's Shopware (test/bdd/shopware-stack.sh), builds the storefront,
# runs the features and takes the stack down again, also on failure.
#
#   pnpm bdd:shopware [playwright args]
#
# QUICKSTART_DIR: a clone of github.com/shopbite-de/shopbite; without it the
# public repository is cloned to .bdd-quickstart/.
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)
stack="$root/test/bdd/shopware-stack.sh"
if [ -z "${QUICKSTART_DIR:-}" ]; then
  QUICKSTART_DIR="$root/.bdd-quickstart"
  if [ ! -d "$QUICKSTART_DIR/.git" ]; then
    git clone --depth 1 https://github.com/shopbite-de/shopbite "$QUICKSTART_DIR"
  fi
fi
export QUICKSTART_DIR

trap '"$stack" down' EXIT
"$stack" up
cd "$root"
pnpm build
pnpm test:bdd:shopware "$@"
