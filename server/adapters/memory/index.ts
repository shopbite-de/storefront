/**
 * The memory adapter (ADR 0001): the whole backend in process memory,
 * seeded with the demo restaurant. It proves the ports can be served
 * without Shopware and backs the contract tests; `shopBite.backend:
 * "memory"` runs the storefront on it (ports not implemented yet answer
 * `not_implemented`).
 */
import { deepFreeze, sortOpeningHours, timeZone } from "../../../shared/domain";
import type { Backend, ShopPort } from "../../ports";
import { notImplemented } from "../notImplemented";
import type { BackendRuntimeConfig } from "../runtimeConfig";
import { DEMO_SEED, type MemorySeed } from "./seed";

export { DEMO_SEED, type MemorySeed } from "./seed";

function createMemoryShop(seed: MemorySeed["shop"]): ShopPort {
  // a frozen copy: neither the seed's owner nor a caller can change it
  const state = deepFreeze({
    ...structuredClone(seed),
    openingHours: sortOpeningHours(
      structuredClone(seed.openingHours.intervals),
    ),
  });
  return {
    getConfig: async () => state.config,
    getOpeningHours: async () => state.openingHours,
    getHolidays: async () => state.holidays,
    listBranches: async () => state.branches,
  };
}

export function createMemoryBackend(seed: MemorySeed = DEMO_SEED): Backend {
  const name = "memory";
  return {
    name,
    catalog: notImplemented("catalog", name),
    navigation: notImplemented("navigation", name),
    cart: notImplemented("cart", name),
    checkout: notImplemented("checkout", name),
    customer: notImplemented("customer", name),
    orders: notImplemented("orders", name),
    shop: createMemoryShop(seed.shop),
    wishlist: notImplemented("wishlist", name),
    contact: notImplemented("contact", name),
  };
}

/** The demo restaurant in the storefront's time zone (`shopBite.timeZone`). */
export function memoryFromRuntimeConfig(config: BackendRuntimeConfig): Backend {
  return createMemoryBackend({
    ...DEMO_SEED,
    shop: {
      ...DEMO_SEED.shop,
      config: {
        ...DEMO_SEED.shop.config,
        timeZone: timeZone(config.shopBite.timeZone),
      },
    },
  });
}
