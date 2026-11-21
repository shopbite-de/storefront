/** Changes salutation and names (`ProfileChange`); answers the `Customer`. */
export default defineEventHandler((event) =>
  answerVisitor(event, "write", async (backend, session) =>
    backend.customer.updateProfile(session, profileBody(await readBody(event))),
  ),
);
