/**
 * Takes over the guest's entries right after the login (`{ configurations }`,
 * newest first, at most 100) and answers the whole wishlist.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.wishlist.merge(session, wishlistMergeBody(await readBody(event))),
  ),
);
