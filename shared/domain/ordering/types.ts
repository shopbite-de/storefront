import type { Address } from "../customer";
import type { Id, Media, Money } from "../kernel";
import type { DishConfiguration } from "../menu";
import type { LeadTime, WishedTime } from "./time";

/** How the order reaches the guest: "Lieferung" or "Abholung". */
export type Fulfillment = "delivery" | "pickup";

/** A way to get the order ("Lieferung", "Abholung"), with its lead time. */
export type ShippingMethod = Readonly<{
  id: Id;
  name: string;
  description: string | null;
  fulfillment: Fulfillment;
  /** Unknown lead time: the storefront assumes its default. */
  leadTime: LeadTime | null;
  media: Media | null;
}>;

/** A way to pay ("Barzahlung", "PayPal"). */
export type PaymentMethod = Readonly<{
  id: Id;
  name: string;
  description: string | null;
  media: Media | null;
  /** Payment happens on another site after the order (redirect). */
  redirects: boolean;
  /** The shop's default, chosen when the selected one cannot be used. */
  preferred: boolean;
}>;

/**
 * The shipping and payment method the visitor's next order uses, also
 * before anything is in the cart (null where the backend has none).
 */
export type CheckoutSelection = Readonly<{
  shippingMethodId: Id | null;
  paymentMethodId: Id | null;
}>;

/**
 * The wished times the guest can choose today: from the earliest wished
 * time to the end of the current or next opening interval.
 */
export type OrderingWindow = Readonly<{
  earliest: WishedTime;
  latest: WishedTime;
}>;

/** An extra on a cart line, as it was priced. */
export type CartLineExtra = Readonly<{
  id: Id;
  name: string;
  /** For one dish. */
  unitPrice: Money;
}>;

/** The chosen option of one variant group ("Größe: Groß 40 cm"). */
export type VariantChoice = Readonly<{ group: string; option: string }>;

/**
 * One configured dish in the cart with its quantity: the dish (variant),
 * its extras and its removed ingredients are one line, priced together.
 * Two lines never hold the same configuration.
 */
export type CartLine = Readonly<{
  id: Id;
  configuration: DishConfiguration;
  /** Menu number of the dish or the chosen variant. */
  dishNumber: string;
  /** The dish's name as ordered, without extras and removals. */
  name: string;
  /** The chosen variant's options, in the dish's group order. */
  variant: readonly VariantChoice[];
  /** In the order the guest chose them. */
  extras: readonly CartLineExtra[];
  /** Names of the removed main ingredients, in the guest's order. */
  removedIngredients: readonly string[];
  quantity: number;
  /** Dish plus extras, for one. */
  unitPrice: Money;
  totalPrice: Money;
  media: Media | null;
}>;

export type CartMessageCode =
  | "dish_unavailable"
  | "quantity_adjusted"
  | "price_changed"
  | "shipping_method_blocked"
  | "payment_method_blocked"
  | "voucher_invalid"
  | "minimum_order_value"
  | "ordering_closed"
  | "other";

/**
 * What the backend says about the cart ("Pizza Hawaii ist nicht mehr
 * verfügbar"). `error` messages block the order.
 */
export type CartMessage = Readonly<{
  code: CartMessageCode;
  severity: "info" | "warning" | "error";
  /** The backend's text, shown when the storefront has none of its own. */
  text: string;
  /** Line, voucher code or method the message is about. */
  subjectId: Id | null;
}>;

/**
 * A price reduction of the cart: from a voucher the guest entered (`code`)
 * or applied automatically (`code` null). `amount` is negative.
 */
export type CartDiscount = Readonly<{
  code: string | null;
  name: string;
  amount: Money;
}>;

/** The guest's cart ("Warenkorb"). */
export type Cart = Readonly<{
  /** In the order they were added. */
  lines: readonly CartLine[];
  discounts: readonly CartDiscount[];
  /** Sum of the lines and the discounts, before shipping. */
  subtotal: Money;
  shippingCosts: Money;
  /** What the guest pays: subtotal plus shipping. */
  total: Money;
  /** Taxes included in the total, per rate (percent). */
  taxes: readonly Readonly<{ rate: number; amount: Money }>[];
  shippingMethodId: Id | null;
  paymentMethodId: Id | null;
  messages: readonly CartMessage[];
}>;

/** Our own order status; adapters map their backend states onto it. */
export type OrderStatus = "open" | "in_progress" | "completed" | "cancelled";

export type PaymentStatus =
  "open" | "paid" | "failed" | "cancelled" | "refunded";

/** A line of a placed order: one dish configuration, as it was priced. */
export type OrderLine = Readonly<{
  id: Id;
  /** What was ordered, so the order can be repeated. */
  configuration: DishConfiguration;
  dishNumber: string;
  name: string;
  extras: readonly Readonly<{ name: string; unitPrice: Money }>[];
  removedIngredients: readonly string[];
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}>;

/** A placed order ("Bestellung"). */
export type Order = Readonly<{
  id: Id;
  /** Order number shown to the guest. */
  number: string;
  /** ISO 8601 date-time. */
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillment: Fulfillment;
  wishedTime: WishedTime | null;
  shippingMethod: Readonly<{ id: Id; name: string }>;
  paymentMethod: Readonly<{ id: Id; name: string }>;
  lines: readonly OrderLine[];
  discounts: readonly CartDiscount[];
  /** Sum of the lines and the discounts, before shipping. */
  subtotal: Money;
  shippingCosts: Money;
  total: Money;
  /** Taxes per rate (percent): included in the total, or on top of it. */
  taxes: readonly Readonly<{ rate: number; amount: Money }>[];
  /** Gross prices (restaurants); false for a net (business) order. */
  taxIncluded: boolean;
  billingAddress: Address;
  /** Null for pickup. */
  deliveryAddress: Address | null;
  email: string;
  /** The guest's note to the restaurant, without the wished time. */
  note: string | null;
}>;

/** The answer to placing an order: the order and where to pay, if elsewhere. */
export type PlacedOrder = Readonly<{
  order: Order;
  /** A payment on another site: send the guest there. */
  redirectUrl: string | null;
  /** The order is placed, but its payment could not be started. */
  paymentFailed: boolean;
}>;
