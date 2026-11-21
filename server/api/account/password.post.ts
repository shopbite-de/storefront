/**
 * Changes the password (`{ currentPassword, newPassword }`). Answers 204;
 * 401 `invalid_credentials` for a wrong current password.
 */
export default defineEventHandler(async (event) => {
  await answerVisitor(event, "write", async (backend, session) => {
    const { currentPassword, newPassword } = passwordChangeBody(
      await readBody(event),
    );
    return backend.customer.changePassword(
      session,
      currentPassword,
      newPassword,
    );
  });
  setResponseStatus(event, 204);
  return null;
});
