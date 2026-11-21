/**
 * The shipping and payment method of the visitor's next order
 * (`CheckoutSelection`); a visitor without a session gets the shop's
 * defaults and no session.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", (backend, session) =>
    backend.checkout.getSelection(session),
  ),
);
