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
  unitPrice: Money;
}>;

/**
 * One configured dish in the cart with its quantity: the dish (variant),
 * its extras and its removed ingredients are one line, priced together.
 */
export type CartLine = Readonly<{
  id: Id;
  configuration: DishConfiguration;
  dishNumber: string;
  /** Dish name as ordered ("Pizza Salami, Groß 40 cm"). */
  name: string;
  extras: readonly CartLineExtra[];
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
  /** Line, voucher or method the message is about. */
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
  lines: readonly CartLine[];
  discounts: readonly CartDiscount[];
  /** Sum of the lines and the discounts. */
  subtotal: Money;
  shippingCosts: Money;
  total: Money;
  taxes: readonly Readonly<{ rate: number; amount: Money }>[];
  shippingMethodId: Id | null;
  paymentMethodId: Id | null;
  messages: readonly CartMessage[];
}>;

/** Our own order status; adapters map their backend states onto it. */
export type OrderStatus = "open" | "in_progress" | "completed" | "cancelled";

export type PaymentStatus =
  "open" | "paid" | "failed" | "cancelled" | "refunded";

/** A line of a placed order. */
export type OrderLine = Readonly<{
  id: Id;
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
  subtotal: Money;
  shippingCosts: Money;
  total: Money;
  billingAddress: Address;
  /** Null for pickup. */
  deliveryAddress: Address | null;
  email: string;
  /** The guest's note to the restaurant, without the wished time. */
  note: string | null;
}>;
