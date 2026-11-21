/**
 * Creates an account (`GuestDetails` plus `password`) and answers
 * `{ customer, confirmationRequired }`; without a confirmation of the
 * e-mail the session is logged in (a new state, the cart stays). 409
 * `email_taken`, 422 `validation_failed` with the refused fields.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.customer.register(
      session,
      registrationBody(await readBody(event)),
      storefrontUrl(event),
    ),
  ),
);
