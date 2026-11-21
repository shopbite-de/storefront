/**
 * The Shopware adapter (ADR 0001): the anti-corruption layer between the
 * storefront's domain and the Shopware Store API with the ShopBite plugin.
 * The only place outside the generated types that may import `#shopware`,
 * `@shopware/*` or `api-types`. Ports move here one step at a time; the
 * rest still answers `not_implemented` (today's routes and composables
 * keep talking to Shopware directly until their step).
 */
import {
  timeZone as checkTimeZone,
  type TimeZone,
} from "../../../shared/domain";
import type { Backend } from "../../ports";
import { notImplemented } from "../notImplemented";
import type { BackendRuntimeConfig } from "../runtimeConfig";
import { createShopwareCart } from "./cart";
import { createShopwareCatalog, currencyReader } from "./catalog";
import { createShopwareCheckout } from "./checkout";
import { createShopwareNavigation } from "./navigation";
import { createShopwareOrdering } from "./ordering";
import { createShopwareShop, type AdapterLog } from "./shop";
import {
  sharingRequestsInFlight,
  type StoreApi,
  type VisitorStoreApi,
} from "./storeApi";

export type { StoreApi, VisitorStoreApi } from "./storeApi";
export type { AdapterLog } from "./shop";

export type ShopwareBackendOptions = Readonly<{
  storeApi: StoreApi;
  /**
   * The Store API with a visitor's context token (cart, checkout, orders);
   * without it these ports are not implemented (only the shop's shipping
   * methods are).
   */
  visitorApi?: VisitorStoreApi;
  /** `public.storeUrl`: picks this storefront's branch. */
  storeUrl: string;
  /** `shopBite.timeZone`: the plugin does not report one. */
  timeZone: TimeZone;
  /** Where dropped backend data is reported; console.warn by default. */
  log?: AdapterLog;
  /** `public.shopBite.menuCategoryId`: overrides the plugin's menu root. */
  menuCategoryId?: string;
  /** ms a visitor's Store API request may take (default 10 s; tests). */
  requestTimeoutMs?: number;
  /** ms the order request may take (default 60 s; tests). */
  orderTimeoutMs?: number;
  /**
   * `public.site.countryId`: the country of an address the guest enters
   * without one, as the checkout form of 2.x sent it.
   */
  countryId?: string;
}>;

export function createShopwareBackend(
  options: ShopwareBackendOptions,
): Backend {
  const name = "shopware";
  const log: AdapterLog =
    options.log ?? ((message, details) => console.warn(message, details));
  // ShopPort, CheckoutPort and the menu root read the plugin
  // configuration, every catalog answer the currency of the context
  const storeApi = sharingRequestsInFlight(options.storeApi, [
    "/shopbite/config",
    "/context",
  ]);
  const shop = createShopwareShop(storeApi, {
    storeUrl: options.storeUrl,
    timeZone: checkTimeZone(options.timeZone),
    log,
  });
  const currency = currencyReader(storeApi);
  const timeZone = checkTimeZone(options.timeZone);
  const shippingMethods = createShopwareCheckout(storeApi, { name, log });
  const ordering = options.visitorApi
    ? createShopwareOrdering(storeApi, options.visitorApi, {
        currency,
        timeZone,
        log,
        requestTimeoutMs: options.requestTimeoutMs,
        orderTimeoutMs: options.orderTimeoutMs,
        countryId: options.countryId,
      })
    : undefined;
  return {
    name,
    catalog: createShopwareCatalog(storeApi, {
      menuCategoryId: options.menuCategoryId,
      log,
    }),
    navigation: createShopwareNavigation(storeApi, {
      menuCategoryId: options.menuCategoryId,
      log,
    }),
    cart: options.visitorApi
      ? createShopwareCart(storeApi, options.visitorApi, {
          currency,
          log,
          requestTimeoutMs: options.requestTimeoutMs,
        })
      : notImplemented("cart", name),
    checkout: ordering
      ? {
          listShippingMethods: shippingMethods.listShippingMethods,
          ...ordering.checkout,
        }
      : shippingMethods,
    customer: notImplemented("customer", name),
    orders: ordering?.orders ?? notImplemented("orders", name),
    shop,
    wishlist: notImplemented("wishlist", name),
    contact: notImplemented("contact", name),
  };
}

/**
 * The Shopware adapter of the running storefront: the Store API through
 * the Nitro utils `storeApiGet`/`storeApiPost` (storefront access key).
 */
export function shopwareFromRuntimeConfig(
  config: BackendRuntimeConfig,
): Backend {
  return createShopwareBackend({
    storeApi: {
      get: (path, options) => storeApiGet(path, options),
      post: (path, body, options) => storeApiPost(path, body, options),
    },
    visitorApi: { send: (request) => storeApiForVisitor(request) },
    storeUrl: config.public.storeUrl,
    timeZone: config.shopBite.timeZone,
    menuCategoryId: config.public.shopBite?.menuCategoryId || undefined,
    countryId: config.public.site?.countryId || undefined,
  });
}
