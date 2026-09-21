import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Nuxt } from "nuxt/schema";

const storefrontRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Installed as a package (a shop's node_modules), the storefront is never the
// project being developed, even when its own `postinstall: nuxt prepare` runs
// there with the package as root.
const isInstalledPackage = storefrontRoot
  .split(/[\\/]/)
  .includes("node_modules");

/**
 * Development tooling of this repository: ESLint config generation, Nuxt
 * hints and the test-utils integration. These packages are devDependencies,
 * which shops extending the layer do not get installed, so they are only
 * registered when the storefront itself is the project (#378). Registered
 * in nuxt.config.ts they would be inherited by every shop and break its
 * install (`postinstall`), `nuxt dev` and `nuxt build`.
 */
export default async function devTooling(_options: unknown, nuxt: Nuxt) {
  if (isInstalledPackage) return;
  if (resolve(nuxt.options.rootDir) !== storefrontRoot) return;

  const { installModule } = await import("nuxt/kit");

  // `pnpm eslint` imports the config this module generates (.nuxt/eslint.config.mjs).
  await installModule("@nuxt/eslint");

  if (nuxt.options.dev) {
    await installModule("@nuxt/test-utils/module");
    await installModule("@nuxt/hints");
  }
}
