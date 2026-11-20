import type {
  Cart,
  GuestDetails,
  Id,
  Order,
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
  /** The guest's note to the restaurant. */
  note: string | null;
}>;

/** Where to send the guest for a payment on another site. */
export type PaymentRedirect = Readonly<{ redirectUrl: string | null }>;

/**
 * Ordering: delivery or pickup, payment, placing the order. The checkout
 * switch and the ordering window are checked by the storefront (ShopPort,
 * domain services) before `placeOrder`; the adapter only reports what the
 * backend refuses.
 *
 * Shopware: shipping/payment methods of the sales channel, `/checkout/
 * order`, `/handle-payment`; the wished time travels in the order's
 * customer comment ("Wunschlieferzeit: 18:40"). Sylius: shipping and
 * payment method selection of the order, checkout complete.
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
  listPaymentMethods(
    session?: BackendSession,
  ): Promise<readonly PaymentMethod[]>;
  /** Throws `shipping_method_blocked` if the cart cannot use it. */
  selectShippingMethod(session: BackendSession, methodId: Id): Promise<Cart>;
  /** Throws `payment_method_blocked` if the cart cannot use it. */
  selectPaymentMethod(session: BackendSession, methodId: Id): Promise<Cart>;
  /**
   * Makes the visitor a guest customer for this session (order without an
   * account); a logged-in customer does not need it.
   */
  registerGuest(session: BackendSession, guest: GuestDetails): Promise<void>;
  /** Places the cart as an order; the cart is empty afterwards. */
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
