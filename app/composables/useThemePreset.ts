import { isThemePresetName, THEME_PRESETS } from "../../shared/theme/presets";

/**
 * The active style preset (#439, #445): `runtimeConfig.public.shopBite
 * .themePreset` (`NUXT_PUBLIC_SHOP_BITE_THEME_PRESET`), by default the
 * `shopBite.preset` of the build (modules/theme.ts), else `trattoria`.
 */
export function useThemePreset() {
  const configured = (
    useRuntimeConfig().public.shopBite as { themePreset?: string } | undefined
  )?.themePreset;
  const preset = isThemePresetName(configured) ? configured : "trattoria";
  const { menuView, colorMode } = THEME_PRESETS[preset];
  return { preset, menuView, colorMode };
}
