/**
 * Starts the storefront session of a new visitor (ADR 0001, step 5): the
 * browser asks once after the first page has loaded, before its first
 * write, so a write that a navigation cuts off still lands in the
 * visitor's session (the cookie of its answer would be lost). A visitor
 * with a session keeps it unchanged. Answers 204.
 */
export default defineEventHandler(async (event) => {
  assertSameOriginWrite(event);
  answerPrivately(event);
  const visitor = useVisitorSession(event);
  if (!(await visitor.id())) {
    // the storefront's own state: no backend is asked
    await visitor.scope("storefront", { create: true }).write("1");
  }
  setResponseStatus(event, 204);
  return null;
});
