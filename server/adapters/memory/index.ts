/**
 * The memory adapter (ADR 0001): the whole backend in process memory,
 * seeded with the demo restaurant. It proves the ports can be served
 * without Shopware and backs the contract tests; `shopBite.backend:
 * "memory"` runs the storefront on it (ports not implemented yet answer
 * `not_implemented`).
 */
import {
  deepFreeze,
  sortOpeningHours,
  timeZone,
  type CheckoutSelection,
} from "../../../shared/domain";
import type { Backend, CheckoutPort, ShopPort } from "../../ports";
import { notImplemented } from "../notImplemented";
import { createMemoryCart } from "./cart";
import { createMemoryCatalog } from "./catalog";
import { createMemoryCustomer, type MemoryMail } from "./customer";
import { createMemoryNavigation } from "./navigation";
import { createMemoryOrdering, type MemoryAccountsView } from "./ordering";
import type { BackendRuntimeConfig } from "../runtimeConfig";
import { demoSeed, type MemorySeed } from "./seed";

export { demoSeed, type MemorySeed } from "./seed";
export type { MemoryCatalog, MemoryDish, MemoryVariant } from "./catalog";
export type { MemoryVoucher } from "./cart";
export type { MemoryNavigation } from "./navigation";
export type { MemoryMail } from "./customer";

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

export function createMemoryBackend(
  seed: MemorySeed = demoSeed(),
  options: {
    /** What the backend would send by e-mail (default: nothing). */
    mail?: (mail: MemoryMail) => void;
  } = {},
): Backend {
  const name = "memory";
  const shippingMethods = deepFreeze(
    structuredClone(seed.checkout.shippingMethods),
  );
  const shop = createMemoryShop(seed.shop);
  // the cart reports the checkout's methods, the checkout orders the cart
  const selection: { of?: (token: string) => CheckoutSelection } = {};
  const cart = createMemoryCart(seed.catalog, seed.cart?.vouchers ?? [], {
    selectionOf: (token) => selection.of!(token),
  });
  const accounts: { view?: MemoryAccountsView } = {};
  const ordering = createMemoryOrdering({
    shippingMethods,
    paymentMethods: seed.checkout.paymentMethods ?? [],
    cart,
    acceptsOrders: () => seed.shop.config.acceptsOrders,
    accounts: () => accounts.view,
  });
  selection.of = ordering.selectionOf;
  const customer = createMemoryCustomer({
    cart,
    guestOf: ordering.guestOf,
    moveSession: ordering.moveSelection,
    doubleOptIn: seed.customer?.doubleOptIn,
    mail: options.mail,
  });
  accounts.view = customer.accounts;
  const checkout: CheckoutPort = {
    listShippingMethods: async () => shippingMethods,
    ...ordering.checkout,
  };
  return {
    name,
    catalog: createMemoryCatalog(seed.catalog),
    navigation: createMemoryNavigation(seed.catalog, seed.navigation),
    cart,
    checkout,
    customer: customer.customer,
    orders: ordering.orders,
    shop,
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
