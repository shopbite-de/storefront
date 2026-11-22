/**
 * Logs the session out; the backend issues a new state, so the cookie of
 * the logged-in session opens nothing. Answers 204.
 */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", (backend, session) =>
    backend.customer.logout(session),
  );
  setResponseStatus(event, 204);
  return null;
});
