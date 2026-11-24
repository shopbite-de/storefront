/**
 * The running scenario of the behaviour tests on the memory adapter (test
 * seam only, `modules/test-seams.ts`): its backend, its restaurant and the
 * mails the backend would have sent.
 */
import type { ShopConfig } from "../../../shared/domain";
import type { Backend, ShopPort } from "../../../server/ports";
import {
  createMemoryBackend,
  demoSeed,
  type MemoryMail,
  type MemorySeed,
} from "../../../server/adapters/memory";
import { replaceBackend } from "../../../server/utils/backend";
import {
  middayTimeZone,
  scenarioShop,
  type RestaurantScenario,
} from "./scenario";

type Running = {
  scenario: RestaurantScenario;
  /** Read live by the memory checkout (`acceptsOrders`) and the shop port. */
  shop: { -readonly [K in keyof MemorySeed["shop"]]: MemorySeed["shop"][K] };
  backend: Backend;
};

/** What the memory backend of the running scenario would have e-mailed. */
export const outbox: MemoryMail[] = [];

let running: Running | undefined;

/** A ShopPort that answers the running scenario's restaurant. */
function liveShop(shop: Running["shop"]): ShopPort {
  return {
    getConfig: async () => structuredClone(shop.config) as ShopConfig,
    getOpeningHours: async () => structuredClone(shop.openingHours),
    getHolidays: async () => structuredClone(shop.holidays),
    listBranches: async () => structuredClone(shop.branches),
  };
}

/** A new scenario: a fresh demo restaurant, no visitors, carts or accounts. */
export function startScenario(
  scenario: RestaurantScenario,
  now = new Date(),
): Running {
  const demo = demoSeed();
  const shop = { ...scenarioShop(demo.shop, scenario, middayTimeZone(now)) };
  const seed: MemorySeed = { ...demo, shop };
  outbox.length = 0;
  const memory = createMemoryBackend(seed, {
    mail: (mail) => outbox.push(mail),
  });
  // the memory checkout reads `seed.shop.config.acceptsOrders` on every
  // order: `changeScenario` swaps the config object in this same `shop`
  const backend: Backend = { ...memory, shop: liveShop(shop) };
  running = { scenario, shop, backend };
  replaceBackend(backend);
  return running;
}

/**
 * Changes the running scenario's restaurant (hours, switch) and keeps its
 * visitors, carts and accounts, e.g. a pause while a guest checks out.
 * The restaurant's time zone stays, so its clock does not jump.
 */
export function changeScenario(change: RestaurantScenario): Running {
  if (!running) return startScenario(change);
  const scenario = { ...running.scenario, ...change };
  const next = scenarioShop(
    demoSeed().shop,
    scenario,
    running.shop.config.timeZone,
  );
  Object.assign(running.shop, next);
  running.scenario = scenario;
  replaceBackend(running.backend);
  return running;
}
