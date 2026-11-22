/** The logged-in customer's wishlist (`WishlistEntry[]`, newest first). */
export default defineEventHandler((event) =>
  answerVisitor(event, "read", (backend, session) =>
    backend.wishlist.listEntries(session),
  ),
);
