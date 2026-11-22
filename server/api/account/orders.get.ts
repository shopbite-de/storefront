/**
 * The customer's orders, newest first (`OrderPage`, `?page=`); 401
 * without a customer or guest.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", (backend, session) =>
    backend.orders.listOrders(
      session,
      orderPageParam(getQuery(event).page),
      ORDERS_PER_PAGE,
    ),
  ),
);
