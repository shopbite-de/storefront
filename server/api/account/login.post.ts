/**
 * Logs the session in (`{ email, password }`) and answers the `Customer`.
 * The backend replaces the session's state (a new seal; the cookie before
 * the login is outdated and opens nothing) and merges the visitor's cart
 * into the customer's. 401 `invalid_credentials` for a wrong password and
 * an unknown e-mail alike, 403 `account_not_confirmed`, 429
 * `rate_limited` (the backend's limit per e-mail and visitor address).
 */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) => {
    const { email, password } = loginBody(await readBody(event));
    return backend.customer.login(session, email, password);
  }),
);
