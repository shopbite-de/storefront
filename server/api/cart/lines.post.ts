/**
 * Adds a configured dish: `{ dishId, variantId?, extraIds?,
 * removedIngredientIds?, quantity }`; the same configuration is merged.
 */
export default defineEventHandler(async (event) =>
  answerCart(event, "write", async (cart, session) => {
    const { configuration, quantity } = cartLineBody(await readBody(event));
    return cart.addLine(session, configuration, quantity);
  }),
);
