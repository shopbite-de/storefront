/** Sets the quantity of a line: `{ quantity }`; 0 removes it. */
export default defineEventHandler(async (event) =>
  answerCart(event, "write", async (cart, session) =>
    cart.changeQuantity(
      session,
      lineIdParam(event),
      quantityBody(await readBody(event)),
    ),
  ),
);
