/**
 * Changes an address of the session's guest or customer (the checkout's
 * "Adresse bearbeiten") and answers the `Orderer`; 404 for an address that
 * is not theirs.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.checkout.updateAddress(
      session,
      addressBody(
        opaqueId(getRouterParam(event, "addressId"), "addressId"),
        await readBody(event),
      ),
    ),
  ),
);
