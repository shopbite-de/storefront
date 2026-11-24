/**
 * The running scenario of the behaviour tests on the memory adapter (test
 * seam only, `modules/test-seams.ts`): its restaurant, the mails its
 * backend would have sent and the orders it took.
 */
import type { Backend, ShopPort } from "../../../server/ports";
import {
  createMemoryBackend,
  demoSeed,
  type MemoryMail,
  type MemorySeed,
} from "../../../server/adapters/memory";
import {
  middayTimeZone,
  scenarioShop,
  type RestaurantScenario,
} from "./scenario";

type Shop = {
  -readonly [K in keyof MemorySeed["shop"]]: MemorySeed["shop"][K];
};

type Running = {
  scenario: RestaurantScenario;
  /** Read live by the memory checkout (`acceptsOrders`) and the shop port. */
  shop: Shop;
};

/** What the memory backend of the running scenario would have e-mailed. */
export const outbox: MemoryMail[] = [];

/** The orders the running scenario's backend took. */
export const placedOrders: { number: string; email: string }[] = [];

let running: Running | undefined;

/** A ShopPort that answers the running scenario's restaurant. */
function liveShop(shop: Shop): ShopPort {
  return {
    getConfig: async () => structuredClone(shop.config),
    getOpeningHours: async () => structuredClone(shop.openingHours),
    getHolidays: async () => structuredClone(shop.holidays),
    listBranches: async () => structuredClone(shop.branches),
  };
}

/**
 * A new scenario: a fresh demo restaurant, no visitors, carts, accounts or
 * orders. `backend` is the process's adapter set (`useBackend()`); its
 * ports are swapped in place, so the storefront's own code stays as it is.
 */
export function startScenario(
  backend: Backend,
  scenario: RestaurantScenario,
  now = new Date(),
): Running {
  const demo = demoSeed();
  const shop: Shop = {
    ...scenarioShop(demo.shop, scenario, middayTimeZone(now)),
  };
  outbox.length = 0;
  placedOrders.length = 0;
  // the memory checkout reads `seed.shop.config.acceptsOrders` on every
  // order: `changeScenario` swaps the config object in this same `shop`
  const memory = createMemoryBackend(
    { ...demo, shop },
    { mail: (mail) => outbox.push(mail) },
  );
  const checkout: Backend["checkout"] = {
    ...memory.checkout,
    placeOrder: async (session, command) => {
      const order = await memory.checkout.placeOrder(session, command);
      placedOrders.push({ number: order.number, email: order.email });
      return order;
    },
  };
  Object.assign(backend, { ...memory, checkout, shop: liveShop(shop) });
  running = { scenario, shop };
  return running;
}

/**
 * Changes the running scenario's restaurant (hours, switch) and keeps its
 * visitors, carts and accounts, e.g. a pause while a guest checks out.
 * The restaurant's time zone stays, so its clock does not jump.
 */
export function changeScenario(
  backend: Backend,
  change: RestaurantScenario,
): Running {
  if (!running) return startScenario(backend, change);
  const scenario = { ...running.scenario, ...change };
  Object.assign(
    running.shop,
    scenarioShop(demoSeed().shop, scenario, running.shop.config.timeZone),
  );
  running.scenario = scenario;
  return running;
}
