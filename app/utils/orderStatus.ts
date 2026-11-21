import type { OrderStatus, PaymentStatus } from "../../shared/domain";

/** How the order pages name an order's status (Shopware's German names). */
export const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

export const PAYMENT_STATUS_LABEL: Readonly<Record<PaymentStatus, string>> = {
  open: "Offen",
  paid: "Bezahlt",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen",
  refunded: "Erstattet",
};
