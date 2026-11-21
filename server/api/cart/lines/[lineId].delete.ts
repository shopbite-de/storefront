/** Removes a line. */
export default defineEventHandler((event) =>
  answerCart(event, "write", (cart, session) =>
    cart.removeLine(session, lineIdParam(event)),
  ),
);
