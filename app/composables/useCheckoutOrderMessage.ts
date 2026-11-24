import type { RouteLocationRaw } from "vue-router";

/** What the checkout says about the last press of the order button. */
export type CheckoutOrderMessage = {
  title: string;
  description: string;
  /** A page that answers the message, e.g. the order already placed. */
  link?: { to: RouteLocationRaw; label: string };
};

/**
 * The checkout's message about the order button, shared by the order card
 * and the checkout page (`Checkout/OrderMessage`).
 */
export function useCheckoutOrderMessage() {
  const message = useState<CheckoutOrderMessage | null>(
    "checkout-order-message",
    () => null,
  );
  return { message };
}
