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
 * Keys that are not port methods: `then` (an awaited port must not look
 * like a promise), `toJSON`, symbols and the Object.prototype methods, so
 * the port can be awaited, logged and serialised.
 */
const isPortMethod = (key: string | symbol): key is string =>
  typeof key === "string" &&
  key !== "then" &&
  key !== "toJSON" &&
  !(key in Object.prototype);

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
    get: (target, key, receiver) =>
      isPortMethod(key)
        ? () =>
            Promise.reject(
              new DomainError(
                "not_implemented",
                `${PORT_INTERFACES[port]}.${key} is not implemented by the "${adapter}" adapter yet.`,
                { port, method: key, adapter },
              ),
            )
        : Reflect.get(target, key, receiver),
  });
}
