/**
 * Makes an address of the account the default billing or delivery address
 * (`{ use: "billing" | "delivery" }`); answers the `Customer`.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.customer.setDefaultAddress(
      session,
      addressIdParam(getRouterParam(event, "addressId")),
      defaultUseBody(await readBody(event)),
    ),
  ),
);
