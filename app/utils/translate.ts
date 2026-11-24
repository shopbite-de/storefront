/**
 * vue-i18n's `t` as the pure helpers take it (ADR 0002): they get their
 * words from the caller, which translates with `useI18n()`, the server
 * with `shopTranslate()`, tests with `messages(code).t`.
 */
export type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;
