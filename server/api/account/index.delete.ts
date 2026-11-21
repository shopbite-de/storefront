/**
 * Deletes the customer's account; the session is a new visitor's (the
 * backend issues a new state). Answers 204.
 */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", (backend, session) =>
    backend.customer.deleteAccount(session),
  );
  setResponseStatus(event, 204);
  return null;
});
