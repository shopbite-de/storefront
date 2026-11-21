/** The account's addresses (`Address[]`); 401 without a customer. */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", (backend, session) =>
    backend.customer.listAddresses(session),
  ),
);
