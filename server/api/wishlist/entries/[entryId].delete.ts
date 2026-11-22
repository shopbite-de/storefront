/** Removes an entry; another customer's or an unknown one is 404. 204. */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", (backend, session) =>
    backend.wishlist.removeEntry(session, entryIdParam(event)),
  );
  setResponseStatus(event, 204);
  return null;
});
