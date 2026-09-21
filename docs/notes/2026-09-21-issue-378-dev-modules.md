# Issue #378: dev-only modules inherited by shops

## Finding

`nuxt.config.ts` registered `@nuxt/eslint` (all builds) and, via
`$development` (applied when `NODE_ENV=development`), `@nuxt/test-utils/module`
and `@nuxt/hints`. All three are devDependencies, so a shop that installs the
layer from npm does not get them, but inherits the module list.

Reproduced with the packed storefront installed into an empty app
(`extends: ["@shopbite-de/storefront"]`, pnpm 10.26.2, `node-linker=hoisted`
like La Fattoria), no dev tooling installed:

- 1.27.0: `pnpm install` fails in the storefront's own `postinstall`
  (`nuxt prepare`, which runs inside `node_modules/@shopbite-de/storefront`
  when build scripts are allowed): `Cannot resolve module "@nuxt/eslint"`.
  With `--ignore-scripts`, `nuxt build` fails the same way.
- With the fix: install, `nuxt build` and `nuxt dev` succeed; no
  `eslint.config.mjs` is written into the shop any more (the old config made
  `@nuxt/eslint` create one wherever it could resolve).

A test app that symlinks the storefront's `node_modules` does not reproduce
the failure: Nuxt then resolves `@nuxt/eslint` through its own real path in the
storefront's pnpm store. Test with a packed tarball and a real install.

## Fix

`modules/dev-tooling.ts` (local module, auto-registered for layers) installs
`@nuxt/eslint` always and `@nuxt/test-utils/module` + `@nuxt/hints` in dev mode,
but only when `rootDir` is the storefront directory and that directory is not
inside `node_modules`. The `$development` block is gone; its other entries
repeated the base modules (arrays are merged, so it never disabled anything).

Module lists of the storefront itself are unchanged (dev: eslint, test-utils,
hints; build: eslint), `pnpm eslint` still finds `.nuxt/eslint.config.mjs`.
