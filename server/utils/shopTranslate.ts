import { shopI18n } from "../../i18n/runtime/shop";
import type { Translate } from "../../app/utils/translate";

/**
 * The shop's messages on the server (ADR 0002), for routes that write text
 * for people (`/llms.txt`): the app's translator and compiled messages.
 */
export function shopTranslate(): Translate {
  return shopI18n.t;
}
