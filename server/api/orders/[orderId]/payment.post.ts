/**
 * Retries the payment of an order of the session (`{ paymentMethodId? }`
 * switches the method first) and answers `{ redirectUrl }`: a payment on
 * another site, or null.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) => {
    const orderId = opaqueId(getRouterParam(event, "orderId"), "orderId");
    const { paymentMethodId } = paymentBody(await readBody(event));
    const order = await backend.orders.getOrder(session, orderId);
    if (paymentMethodId && paymentMethodId !== order.paymentMethod.id) {
      await backend.checkout.changePaymentMethod(
        session,
        orderId,
        paymentMethodId,
      );
    }
    return backend.checkout.startPayment(
      session,
      orderId,
      paymentUrls(orderId),
    );
  }),
);
