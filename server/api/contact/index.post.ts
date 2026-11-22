import { contactFormData } from "../../utils/shopData";

/**
 * Sends a contact message (`{ salutation?, firstName?, lastName?, email,
 * phone?, subject, message }`) and answers `{ confirmation }`: the
 * restaurant's own text, or null for the storefront's. Shop-wide: no
 * session is read or created. 400 for a field the form would not send (also
 * a field the restaurant requires left empty), 413 above 64 KB,
 * 429 `rate_limited` when the backend holds the visitor's address back.
 */
export default defineEventHandler(async (event) => {
  assertSameOriginWrite(event);
  answerPrivately(event);
  const backend = useBackend(event);
  return answerDomain(async () => {
    // the fields the restaurant requires, as the form shows them (cached)
    const form = await contactFormData
      .cached()
      .catch(() => OPTIONAL_CONTACT_FORM);
    const message = contactBody(await readSmallBody(event), form);
    if (message === "spam") return { confirmation: null };
    return backend.contact.send(message, contactSender(event));
  });
});
