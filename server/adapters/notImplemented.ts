import { DomainError } from "../../shared/domain";
import type { Backend, PortName } from "../ports";

const PORT_INTERFACES: Record<PortName, string> = {
  catalog: "CatalogPort",
  navigation: "NavigationPort",
  cart: "CartPort",
  checkout: "CheckoutPort",
  customer: "CustomerPort",
  orders: "OrderPort",
  shop: "ShopPort",
  wishlist: "WishlistPort",
  contact: "ContactPort",
};

/**
 * A port an adapter does not implement yet: every method rejects with a
 * `not_implemented` DomainError that names port, method and adapter. The
 * migration (ADR 0001) fills the ports one step at a time.
 */
export function notImplemented<P extends PortName>(
  port: P,
  adapter: string,
): Backend[P] {
  return new Proxy({} as Backend[P], {
    get: (_target, method) =>
      typeof method === "string" && method !== "then"
        ? () =>
            Promise.reject(
              new DomainError(
                "not_implemented",
                `${PORT_INTERFACES[port]}.${method} is not implemented by the "${adapter}" adapter yet.`,
                { port, method, adapter },
              ),
            )
        : undefined,
  });
}
