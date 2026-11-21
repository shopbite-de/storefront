import type { Cart, DishConfiguration, Id } from "../../shared/domain";
import type { BackendSession } from "./session";

/**
 * Ordering: the visitor's cart. Every method answers with the whole cart
 * as the backend calculated it (prices, messages), so the storefront never
 * calculates totals itself. A visitor without state in the session has an
 * empty cart; the first write gives the session its state.
 *
 * A configured dish (variant, extras, removed ingredients) is ONE cart
 * line. Adding the same configuration again raises its quantity; two
 * configurations that differ in anything (also only in the removed
 * ingredients) are two lines. Shopware: a `container` line item with the
 * dish and its extras as children (ShopBite plugin), a plain `product`
 * line item without extras or removals. Sylius: an order item with
 * adjustments or a plugin's configurable item.
 *
 * Errors: `dish_unavailable` for a dish the menu does not offer,
 * `invalid_value` for an extra or removed ingredient the dish does not
 * have or a quantity outside 1–`MAX_LINE_QUANTITY`, `not_found` for a line
 * the cart does not hold, `backend_unavailable`.
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
  /**
   * Adds a voucher; it shows as a discount with its code. A code that does
   * not apply leaves the discounts as they are and answers the cart with a
   * `voucher_invalid` message about the code.
   */
  applyVoucher(session: BackendSession, code: string): Promise<Cart>;
  removeVoucher(session: BackendSession, code: string): Promise<Cart>;
}

/** The most of one cart line (the cart's quantity stepper stops there). */
export const MAX_LINE_QUANTITY = 100;
