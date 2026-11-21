/**
 * Confirms a registration with the parameters of the e-mail link (passed
 * on as they came) and logs the session in; answers the `Customer`. 404
 * for a broken link, 409 `already_confirmed`.
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.customer.confirmRegistration(
      session,
      confirmationBody(await readBody(event)),
    ),
  ),
);
