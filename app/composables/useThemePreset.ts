type PresetInfo = {
  menuView: "bon" | "bonPhoto" | "listPhoto";
  colorMode: "light" | "dark";
};

/**
 * The active style preset (#439, #445): `runtimeConfig.public.shopBite
 * .themePreset` (`NUXT_PUBLIC_SHOP_BITE_THEME_PRESET`), by default the
 * `shopBite.preset` of the build, else `trattoria`. modules/theme.ts puts
 * the menu view and colour mode of every preset into the runtime config.
 */
export function useThemePreset() {
  const shopBite = useRuntimeConfig().public.shopBite as
    | { themePreset?: string; themePresets?: Record<string, PresetInfo> }
    | undefined;
  const presets = shopBite?.themePresets ?? {};
  const configured = shopBite?.themePreset ?? "";
  const preset = Object.hasOwn(presets, configured) ? configured : "trattoria";
  const { menuView, colorMode } = presets[preset] ?? {
    menuView: "bon",
    colorMode: "light",
  };
  return { preset, menuView, colorMode };
}
