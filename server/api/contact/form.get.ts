import { answerBackendData, contactFormData } from "../../utils/shopData";

/**
 * The contact form's fields the restaurant requires beside e-mail, subject
 * and message (`ContactForm`). Cached for server-side rendering like the
 * shop's configuration; `?fresh=1` asks the backend.
 */
export default defineEventHandler((event) =>
  answerBackendData(event, contactFormData),
);
