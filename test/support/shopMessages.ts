import { fileURLToPath } from "node:url";
import { compileMessages, loadMessages } from "../../i18n/messages";

/**
 * `#shopbite-messages` of the Node test project: the storefront's German
 * messages, compiled as modules/locale.ts compiles them for the default
 * build.
 */
const storefront = fileURLToPath(new URL("../..", import.meta.url));

export const messages = {
  de: compileMessages(loadMessages([storefront], "de")),
};
