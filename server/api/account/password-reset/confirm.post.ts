/**
 * Sets a new password with the token of the reset link
 * (`{ token, newPassword }`). Answers 204; 404 for an unknown, used or
 * expired token, 422 for a password the backend refuses.
 */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", async (backend, session) => {
    const { token, newPassword } = resetBody(await readBody(event));
    return backend.customer.resetPassword(session, token, newPassword);
  });
  setResponseStatus(event, 204);
  return null;
});
