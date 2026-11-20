/**
 * The memory adapter (ADR 0001): the whole backend in process memory,
 * seeded with the demo restaurant. It proves the ports can be served
 * without Shopware and backs the contract tests; `shopBite.backend:
 * "memory"` runs the storefront on it (ports not implemented yet answer
 * `not_implemented`).
 */
import { deepFreeze, sortOpeningHours, timeZone } from "../../../shared/domain";
import type { Backend, CheckoutPort, ShopPort } from "../../ports";
import { notImplemented, partlyImplemented } from "../notImplemented";
import { createMemoryCatalog } from "./catalog";
import type { BackendRuntimeConfig } from "../runtimeConfig";
import { demoSeed, type MemorySeed } from "./seed";

export { demoSeed, type MemorySeed } from "./seed";
export type { MemoryCatalog, MemoryDish, MemoryVariant } from "./catalog";

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

function createMemoryCheckout(
  seed: MemorySeed["checkout"],
  name: string,
): CheckoutPort {
  const shippingMethods = deepFreeze(structuredClone(seed.shippingMethods));
  return partlyImplemented("checkout", name, {
    listShippingMethods: async () => shippingMethods,
  });
}

export function createMemoryBackend(seed: MemorySeed = demoSeed()): Backend {
  const name = "memory";
  return {
    name,
    catalog: createMemoryCatalog(seed.catalog),
    navigation: notImplemented("navigation", name),
    cart: notImplemented("cart", name),
    checkout: createMemoryCheckout(seed.checkout, name),
    customer: notImplemented("customer", name),
    orders: notImplemented("orders", name),
    shop: createMemoryShop(seed.shop),
    wishlist: notImplemented("wishlist", name),
    contact: notImplemented("contact", name),
  };
}

/** The demo restaurant in the storefront's time zone (`shopBite.timeZone`). */
export function memoryFromRuntimeConfig(config: BackendRuntimeConfig): Backend {
  const demo = demoSeed();
  return createMemoryBackend({
    ...demo,
    shop: {
      ...demo.shop,
      config: {
        ...demo.shop.config,
        timeZone: timeZone(config.shopBite.timeZone),
      },
    },
  });
}
