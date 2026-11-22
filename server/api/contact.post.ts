/**
 * Sends a contact message (`{ salutation?, firstName?, lastName?, email,
 * phone?, subject, message }`) and answers `{ confirmation }`: the
 * restaurant's own text, or null for the storefront's. Shop-wide: no
 * session is read or created. 400 for a field the form would not send,
 * 429 `rate_limited` when the backend holds the visitor's address back.
 */
export default defineEventHandler(async (event) => {
  assertSameOriginWrite(event);
  answerPrivately(event);
  const backend = useBackend(event);
  return answerDomain(async () => {
    const message = contactBody(await readBody(event));
    if (message === "spam") return { confirmation: null };
    return backend.contact.send(message, contactSender(event));
  });
});
