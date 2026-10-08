/**
 * Marks `<html>` with the active style preset (#445), which scopes the
 * preset stylesheet; the preset comes from runtime config, so one build
 * serves every preset.
 */
export default defineNuxtPlugin(() => {
  const { preset } = useThemePreset();
  useHead({ htmlAttrs: { "data-preset": preset } });
});
