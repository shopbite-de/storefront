import type { Id, Order } from "../../shared/domain";
import type { BackendSession } from "./session";

export type OrderPage = Readonly<{
  orders: readonly Order[];
  total: number;
  page: number;
  limit: number;
}>;

/**
 * Ordering: placed orders of the session's customer (account) or guest
 * (the orders placed in this session). Statuses are the storefront's own
 * (`OrderStatus`, `PaymentStatus`); the adapter maps its backend's states.
 * An order of another visitor is never readable: it is `not_found`, the
 * same as one that does not exist.
 *
 * Shopware: `/order` with the visitor's context (a guest stays logged in
 * as guest customer for the session) and state machine states. Sylius:
 * orders with `state`, `paymentState`, `shippingState`.
 */
export interface OrderPort {
  /** Newest first. Throws `unauthenticated` without a guest or customer. */
  listOrders(
    session: BackendSession,
    page?: number,
    limit?: number,
  ): Promise<OrderPage>;
  /** An order of the session's customer or guest. Throws `not_found`. */
  getOrder(session: BackendSession, orderId: Id): Promise<Order>;
}
