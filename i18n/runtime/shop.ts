import { shopLocale } from "#shopbite-locale";
import { messages } from "#shopbite-messages";
import { createTranslator } from "./translator";

/**
 * The shop's messages in its one locale (ADR 0002), for the app and the
 * server. Messages and locale are fixed at build time, so one translator
 * serves every component and request.
 */
export const shopI18n = createTranslator({
  locale: shopLocale.code,
  fallbackLocale: shopLocale.fallbackLocale,
  messages,
});

/** `const { t } = useI18n()` in components and composables. */
export function useI18n() {
  return { t: shopI18n.t, locale: shopLocale.code };
}
