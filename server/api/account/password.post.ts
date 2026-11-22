/**
 * Changes the password (`{ currentPassword, newPassword }`) and answers
 * `{ loggedIn }`: the password is changed; `false` when the session could
 * not stay logged in with it (the customer logs in again). 401
 * `invalid_credentials` for a wrong current password.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) => {
    const { currentPassword, newPassword } = passwordChangeBody(
      await readBody(event),
    );
    return backend.customer.changePassword(
      session,
      currentPassword,
      newPassword,
    );
  }),
);
