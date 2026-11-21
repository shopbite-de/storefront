import type {
  Address,
  CheckoutSelection,
  Fulfillment,
  GuestDetails,
  Id,
  Order,
  Orderer,
  PaymentMethod,
  ShippingMethod,
  WishedTime,
} from "../../shared/domain";
import type { BackendSession } from "./session";

export type PlaceOrderCommand = Readonly<{
  /**
   * The guest's wished time (service date and time); the storefront
   * checked it against the ordering window.
   */
  wishedTime: WishedTime;
  /** Of the selected shipping method: how the wished time is meant. */
  fulfillment: Fulfillment;
  /** The guest's note to the restaurant. */
  note: string | null;
}>;

/** Where to send the guest for a payment on another site. */
export type PaymentRedirect = Readonly<{ redirectUrl: string | null }>;

/**
 * Ordering: delivery or pickup, payment, who orders, placing the order. The
 * checkout switch and the ordering window are checked by the storefront
 * (ShopPort, domain services) before `placeOrder`; the adapter reports
 * what the backend refuses.
 *
 * Shopware: shipping/payment methods of the sales channel and the
 * context, guest customers (`/account/register` with `guest`),
 * `/checkout/order`, `/handle-payment`; the wished time travels in the
 * order's customer comment ("Wunschlieferzeit: 18:40"). Sylius: shipping
 * and payment method selection of the order, the order's customer and
 * addresses, checkout complete.
 */
export interface CheckoutPort {
  /**
   * The shop's active shipping methods with fulfillment and lead time,
   * including blocked ones (a delivery-area rule only matches once an
   * address is known). Without a session shop-wide, also for texts without
   * a cart (the BFF caches that answer); a backend that prices shipping per
   * cart (Sylius) may use the session.
   */
  listShippingMethods(
    session?: BackendSession,
  ): Promise<readonly ShippingMethod[]>;
  /**
   * The payment methods the visitor can use now (rules on the cart), in
   * the shop's order; without a session those of a new visitor.
   */
  listPaymentMethods(
    session?: BackendSession,
  ): Promise<readonly PaymentMethod[]>;
  /**
   * The methods the visitor's next order uses; a visitor without state
   * gets the shop's defaults (no session is created).
   */
  getSelection(session?: BackendSession): Promise<CheckoutSelection>;
  /**
   * Selects a shipping method, also one the cart cannot use yet: whether
   * it works is a `shipping_method_blocked` message of the cart (a
   * delivery-area rule needs the address). `invalid_value` for a method
   * the shop does not have.
   */
  selectShippingMethod(
    session: BackendSession,
    methodId: Id,
  ): Promise<CheckoutSelection>;
  /** Like `selectShippingMethod`; the cart reports `payment_method_blocked`. */
  selectPaymentMethod(
    session: BackendSession,
    methodId: Id,
  ): Promise<CheckoutSelection>;
  /** The guest or logged-in customer of the session; null for a visitor. */
  getOrderer(session: BackendSession): Promise<Orderer | null>;
  /**
   * Makes the visitor a guest for this session (order without an
   * account). `storefrontUrl` is where the guest orders (links in the
   * backend's e-mails). Throws `validation_failed` with the fields the
   * backend refused.
   */
  registerGuest(
    session: BackendSession,
    guest: GuestDetails,
    storefrontUrl: string,
  ): Promise<Orderer>;
  /**
   * Changes an address of the orderer (guest details stay editable after
   * `registerGuest`); `not_found` for an address that is not theirs.
   */
  updateAddress(session: BackendSession, address: Address): Promise<Orderer>;
  /**
   * Places the cart as an order; the cart is empty afterwards. Never sent
   * twice by the adapter: an answer that does not come is
   * `backend_unavailable` and the order may exist (the storefront looks it
   * up before placing again). `cart_empty`, `ordering_closed`,
   * `shipping_method_blocked`, `payment_method_blocked`,
   * `dish_unavailable`, `unauthenticated` (no guest or customer),
   * `validation_failed` for other refusals.
   */
  placeOrder(
    session: BackendSession,
    command: PlaceOrderCommand,
  ): Promise<Order>;
  /**
   * Switches the payment method of a placed order whose payment failed or
   * is still open, before `startPayment` retries it. Throws
   * `payment_method_blocked`.
   */
  changePaymentMethod(
    session: BackendSession,
    orderId: Id,
    paymentMethodId: Id,
  ): Promise<Order>;
  /** Starts the payment of an order (also a retry after a failure). */
  startPayment(
    session: BackendSession,
    orderId: Id,
    urls: Readonly<{ success: string; failure: string }>,
  ): Promise<PaymentRedirect>;
}
