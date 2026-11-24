import type { OrderStatus, PaymentStatus } from "../../shared/domain";

/**
 * The messages that name an order's status on the order pages
 * (`order.orderStatus.*`; in German Shopware's names).
 */
export const ORDER_STATUS_MESSAGE: Readonly<Record<OrderStatus, string>> = {
  open: "order.orderStatus.open",
  in_progress: "order.orderStatus.inProgress",
  completed: "order.orderStatus.completed",
  cancelled: "order.orderStatus.cancelled",
};

/** The messages that name an order's payment status (`order.paymentStatus.*`). */
export const PAYMENT_STATUS_MESSAGE: Readonly<Record<PaymentStatus, string>> = {
  open: "order.paymentStatus.open",
  paid: "order.paymentStatus.paid",
  failed: "order.paymentStatus.failed",
  cancelled: "order.paymentStatus.cancelled",
  refunded: "order.paymentStatus.refunded",
};
