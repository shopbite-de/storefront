/**
 * POST /api/_test/scenario starts a behaviour scenario on the memory
 * adapter: a fresh demo restaurant (no carts, accounts or orders of an
 * earlier scenario) with the given opening hours and checkout switch.
 * PATCH changes the running scenario's restaurant and keeps its visitors.
 * Both empty the Nitro cache, so pages show the restaurant at once.
 *
 * Only in builds made with SHOPBITE_TEST_SEAMS=1 (`modules/test-seams.ts`),
 * and even there only while `shopBite.backend` is `memory`: a Shopware
 * backend cannot be changed through it.
 */
import { createError, defineEventHandler, getMethod, readBody } from "h3";
import { useRuntimeConfig, useStorage } from "nitropack/runtime";
import { parseScenario } from "./scenario";
import { changeScenario, startScenario } from "./state";

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).shopBite.backend !== "memory") {
    throw createError({ statusCode: 404 });
  }
  let scenario;
  try {
    scenario = parseScenario(await readBody(event).catch(() => undefined));
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: (error as Error).message,
    });
  }
  const running =
    getMethod(event) === "PATCH"
      ? changeScenario(scenario)
      : startScenario(scenario);
  const storage = useStorage();
  const keys = await storage.getKeys("cache:nitro");
  await Promise.all(keys.map((key) => storage.removeItem(key)));
  return {
    timeZone: running.shop.config.timeZone,
    acceptsOrders: running.shop.config.acceptsOrders,
    openingHours: running.shop.openingHours.intervals[0]?.interval ?? null,
  };
});
