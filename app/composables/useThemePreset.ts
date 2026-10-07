import type { ThemePreset, ThemePresetName } from "#shared/theme/presets";

type ThemeRuntime = {
  preset: ThemePresetName | "";
  menuView: ThemePreset["menuView"] | "";
};

/**
 * The style preset the shop was built with (#439, modules/theme.ts).
 * `hasPreset` is false for shops without one: they keep the Nuxt UI
 * screens until they opt in.
 */
export function useThemePreset() {
  const theme = useRuntimeConfig().public.shopBiteTheme as
    ThemeRuntime | undefined;
  const preset = theme?.preset ?? "";
  return {
    preset,
    hasPreset: preset !== "",
    menuView: theme?.menuView || "bon",
  };
}
