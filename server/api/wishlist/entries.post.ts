/**
 * Keeps a dish configuration (`{ dishId, variantId?, extraIds?,
 * removedIngredientIds? }`) and answers its `WishlistEntry`; an equal one
 * is answered as it is.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.wishlist.addEntry(
      session,
      wishlistEntryBody(await readBody(event)),
    ),
  ),
);
