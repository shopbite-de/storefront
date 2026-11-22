/**
 * Changes an address of the account and answers it; 404 for an address
 * that is not the customer's.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.customer.saveAddress(
      session,
      accountAddressBody(
        addressIdParam(getRouterParam(event, "addressId")),
        await readBody(event),
      ),
    ),
  ),
);
