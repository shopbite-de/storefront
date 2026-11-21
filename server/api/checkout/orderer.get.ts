/**
 * Who orders in this session: `{ orderer }` with the guest's or the
 * logged-in customer's billing and delivery address, `null` before the
 * guest's details are known.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", async (backend, session) => ({
    orderer: await backend.checkout.getOrderer(session),
  })),
);
