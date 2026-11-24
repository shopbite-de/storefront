import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addServerHandler } from "nuxt/kit";
import type { Nuxt } from "nuxt/schema";

const storefrontRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The routes of the behaviour tests (`test/bdd/seam/`). */
export const TEST_SEAM_ROUTES = [
  { route: "/api/_test/scenario", method: "post", file: "scenario.route.ts" },
  { route: "/api/_test/scenario", method: "patch", file: "scenario.route.ts" },
  { route: "/api/_test/mails", method: "get", file: "records.get.ts" },
  { route: "/api/_test/orders", method: "get", file: "records.get.ts" },
] as const;

/** Whether a build gets the test seams: only with SHOPBITE_TEST_SEAMS=1. */
export function wantsTestSeams(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return env.SHOPBITE_TEST_SEAMS === "1";
}

/**
 * Test seams of the behaviour tests (test/bdd): a route that starts a
 * scenario on the memory adapter (opening hours, checkout switch, fresh
 * state) and two that list the mails it would have sent and the orders it
 * took.
 *
 * They exist only in a build made with SHOPBITE_TEST_SEAMS=1 of the
 * storefront itself (never in a shop extending the layer). The Docker
 * image, the npm package and CI's production build are made without it,
 * and the production build is checked for the routes (`ci.yaml`,
 * `node.dockerfile`). At runtime the routes answer 404 unless
 * `shopBite.backend` is `memory`.
 */
export default function testSeams(_options: unknown, nuxt: Nuxt) {
  if (!wantsTestSeams(process.env)) return;
  if (resolve(nuxt.options.rootDir) !== storefrontRoot) return;
  for (const { route, method, file } of TEST_SEAM_ROUTES) {
    addServerHandler({
      route,
      method,
      handler: resolve(storefrontRoot, "test/bdd/seam", file),
    });
  }
  console.warn(
    "[shopbite] Test seams built in (SHOPBITE_TEST_SEAMS=1): a build for the behaviour tests only, never deploy it.",
  );
}
