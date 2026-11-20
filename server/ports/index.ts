/**
 * Ports (ADR 0001): what the storefront needs from a shop backend, in the
 * storefront's own language (GLOSSARY.md). Adapters in `server/adapters/`
 * implement them; server routes reach them through `useBackend(event)`.
 */
import type { CartPort } from "./CartPort";
import type { CatalogPort } from "./CatalogPort";
import type { CheckoutPort } from "./CheckoutPort";
import type { ContactPort } from "./ContactPort";
import type { CustomerPort } from "./CustomerPort";
import type { NavigationPort } from "./NavigationPort";
import type { OrderPort } from "./OrderPort";
import type { ShopPort } from "./ShopPort";
import type { WishlistPort } from "./WishlistPort";

export type * from "./CartPort";
export type * from "./CatalogPort";
export type * from "./CheckoutPort";
export type * from "./ContactPort";
export type * from "./CustomerPort";
export type * from "./NavigationPort";
export type * from "./OrderPort";
export type * from "./session";
export type * from "./ShopPort";
export type * from "./WishlistPort";

/** One adapter's implementation of every port. */
export interface Backend {
  /** Adapter name, e.g. `shopware`. */
  readonly name: string;
  readonly catalog: CatalogPort;
  readonly navigation: NavigationPort;
  readonly cart: CartPort;
  readonly checkout: CheckoutPort;
  readonly customer: CustomerPort;
  readonly orders: OrderPort;
  readonly shop: ShopPort;
  readonly wishlist: WishlistPort;
  readonly contact: ContactPort;
}

export type PortName = Exclude<keyof Backend, "name">;
