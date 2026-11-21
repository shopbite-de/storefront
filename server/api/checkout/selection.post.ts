/**
 * Selects the shipping method (`{ shippingMethodId }`) or the payment
 * method (`{ paymentMethodId }`) of the visitor's next order and answers
 * the `CheckoutSelection`. A method the cart cannot use is selected
 * anyway; the cart's messages say so (`shipping_method_blocked`).
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) => {
    const choice = selectionBody(await readBody(event));
    return "shippingMethodId" in choice
      ? backend.checkout.selectShippingMethod(session, choice.shippingMethodId)
      : backend.checkout.selectPaymentMethod(session, choice.paymentMethodId);
  }),
);
