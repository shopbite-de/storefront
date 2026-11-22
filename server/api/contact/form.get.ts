import { answerDomain } from "../../utils/domainHttp";
import { contactFormData } from "../../utils/shopData";

/**
 * The contact form's fields the restaurant requires beside e-mail, subject
 * and message (`ContactForm`), from the cached function `contact-form`
 * (`config` TTL, emptied by every purge, `{ "layout": true }` included).
 * Always the cached value, also for `?fresh=1`: the backend learns the
 * fields with a probe, which visitors must not be able to multiply.
 */
export default defineEventHandler(() =>
  answerDomain(() => contactFormData.cached()),
);
