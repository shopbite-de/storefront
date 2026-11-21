/**
 * The payment methods the visitor can use now (`PaymentMethod[]`, rules on
 * the cart), with the shop's default as `preferred`.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", (backend, session) =>
    backend.checkout.listPaymentMethods(session),
  ),
);
