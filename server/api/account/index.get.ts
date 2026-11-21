/**
 * The session's customer (`{ customer: Customer | null }`): a logged-in
 * customer, the guest of the session or null. Never creates a session.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", async (backend, session) => ({
    customer: await backend.customer.getCustomer(session),
  })),
);
