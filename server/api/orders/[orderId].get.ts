/**
 * An order of the session's guest or customer (`Order`), for the
 * confirmation and the order page. Another visitor's order, a guessed id
 * and a visitor without a session are all 404.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", (backend, session) =>
    backend.orders.getOrder(
      session,
      opaqueId(getRouterParam(event, "orderId"), "orderId"),
    ),
  ),
);
