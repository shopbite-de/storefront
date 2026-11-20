/**
 * The memory adapter (ADR 0001): the whole backend in process memory,
 * seeded with the demo restaurant. It proves the ports can be served
 * without Shopware and backs the contract tests; `shopBite.backend:
 * "memory"` runs the storefront on it (ports not implemented yet answer
 * `not_implemented`).
 */
import type { Backend, ShopPort } from "../../ports";
import { notImplemented } from "../notImplemented";
import { DEMO_SEED, type MemorySeed } from "./seed";

export { DEMO_SEED, type MemorySeed } from "./seed";

function createMemoryShop(seed: MemorySeed["shop"]): ShopPort {
  // answers are copies: a caller cannot change the restaurant
  const state = structuredClone(seed);
  const openingHours = {
    intervals: [...state.openingHours.intervals].sort(
      (a, b) =>
        a.weekday - b.weekday ||
        a.interval.opens.minutes - b.interval.opens.minutes,
    ),
  };
  return {
    getConfig: async () => structuredClone(state.config),
    getOpeningHours: async () => structuredClone(openingHours),
    getHolidays: async () => structuredClone(state.holidays),
    listBranches: async () => structuredClone(state.branches),
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
