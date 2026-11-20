/**
 * The Shopware adapter (ADR 0001): the anti-corruption layer between the
 * storefront's domain and the Shopware Store API with the ShopBite plugin.
 * The only place outside the generated types that may import `#shopware`,
 * `@shopware/*` or `api-types`. Ports move here one step at a time; the
 * rest still answers `not_implemented` (today's routes and composables
 * keep talking to Shopware directly until their step).
 */
import type { Backend } from "../../ports";
import { notImplemented } from "../notImplemented";
import { createShopwareShop } from "./shop";
import type { StoreApi } from "./storeApi";

export type { StoreApi } from "./storeApi";

export type ShopwareBackendOptions = Readonly<{
  storeApi: StoreApi;
  /** `public.storeUrl`: picks this storefront's branch. */
  storeUrl: string;
}>;

export function createShopwareBackend({
  storeApi,
  storeUrl,
}: ShopwareBackendOptions): Backend {
  const name = "shopware";
  return {
    name,
    catalog: notImplemented("catalog", name),
    navigation: notImplemented("navigation", name),
    cart: notImplemented("cart", name),
    checkout: notImplemented("checkout", name),
    customer: notImplemented("customer", name),
    orders: notImplemented("orders", name),
    shop: createShopwareShop(storeApi, storeUrl),
    wishlist: notImplemented("wishlist", name),
    contact: notImplemented("contact", name),
  };
}
