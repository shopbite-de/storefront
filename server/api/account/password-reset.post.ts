/**
 * Asks for a password reset link (`{ email }`). Answers 204 whether the
 * e-mail has an account or not (no account enumeration); 429
 * `rate_limited` when the backend holds back.
 */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", async (backend, session) =>
    backend.customer.requestPasswordReset(
      session,
      resetRequestBody(await readBody(event)).email,
      storefrontUrl(event),
    ),
  );
  setResponseStatus(event, 204);
  return null;
});
