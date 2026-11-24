// One locale per shop (ADR 0002): every request is in the shop's locale.
export default defineI18nLocaleDetector(
  (_event, config) => config.defaultLocale,
);
