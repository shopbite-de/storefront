/**
 * Changes the e-mail (`{ email, password }`) and answers the `Customer`.
 * 401 `invalid_credentials` for a wrong password, 409 `email_taken`.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) => {
    const { email, password } = emailChangeBody(await readBody(event));
    return backend.customer.changeEmail(session, email, password);
  }),
);
