/**
 * Deletes an address of the account. Answers 204; 404 for an address that
 * is not the customer's, 409 `address_in_use` for a default address.
 */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", (backend, session) =>
    backend.customer.deleteAddress(
      session,
      addressIdParam(getRouterParam(event, "addressId")),
    ),
  );
  setResponseStatus(event, 204);
  return null;
});
