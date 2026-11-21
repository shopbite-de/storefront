/**
 * Makes the visitor a guest with the details of the checkout form
 * (`GuestDetails`) and answers the `Orderer`. The cart stays.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.checkout.registerGuest(
      session,
      guestBody(await readBody(event)),
      storefrontUrl(event),
    ),
  ),
);
