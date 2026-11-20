import type { Cart, DishConfiguration, Id } from "../../shared/domain";
import type { BackendSession } from "./session";

/**
 * Ordering: the visitor's cart. Every method answers with the whole cart
 * as the backend calculated it (prices, messages), so the storefront never
 * calculates totals itself.
 *
 * A configured dish (variant, extras, removed ingredients) is ONE cart
 * line. Adding the same configuration again raises its quantity. Shopware:
 * a `container` line item with the dish and its extras as children (ShopBite
 * plugin), a plain `product` line item without extras or removals. Sylius:
 * an order item with adjustments or a plugin's configurable item.
 */
export interface CartPort {
  getCart(session: BackendSession): Promise<Cart>;
  /** Adds a configured dish; the same configuration is merged. */
  addLine(
    session: BackendSession,
    configuration: DishConfiguration,
    quantity: number,
  ): Promise<Cart>;
  /** Sets the quantity of a line; 0 removes it. */
  changeQuantity(
    session: BackendSession,
    lineId: Id,
    quantity: number,
  ): Promise<Cart>;
  removeLine(session: BackendSession, lineId: Id): Promise<Cart>;
  /** Throws `voucher_invalid` when the code does not apply. */
  applyVoucher(session: BackendSession, code: string): Promise<Cart>;
  removeVoucher(session: BackendSession, code: string): Promise<Cart>;
}
