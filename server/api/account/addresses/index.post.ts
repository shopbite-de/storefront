/** Adds an address to the account and answers it (`Address`). */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.customer.saveAddress(
      session,
      accountAddressBody(null, await readBody(event)),
    ),
  ),
);
