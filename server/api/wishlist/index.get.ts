/**
 * The logged-in customer's wishlist (`WishlistEntry[]`, newest first). The
 * read may move Shopware's own wishlist into it, so it runs one after the
 * visitor's writes (never two moves at once).
 */
export default defineEventHandler((event) =>
  answerVisitor(
    event,
    "read",
    (backend, session) => backend.wishlist.listEntries(session),
    { exclusiveRead: true },
  ),
);
