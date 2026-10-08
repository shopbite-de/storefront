import { addTemplate, defineNuxtModule, useLogger } from "nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import {
  contrastFailures,
  isThemePresetName,
  presetCss,
  resolvePreset,
  THEME_PRESETS,
  type ThemeColors,
  type ThemePreset,
  type ThemePresetName,
} from "../shared/theme/presets";

export interface ShopBiteThemeOptions {
  /**
   * Style preset of the shop (#439): "trattoria" (default), "grill" or
   * "asia". The `NUXT_SHOPBITE_PRESET` build environment variable takes
   * precedence.
   */
  preset?: ThemePresetName;
  /** Colour tokens the shop overrides, e.g. `{ primary: "#3F7D20" }`. */
  colors?: Partial<ThemeColors>;
}

const logger = useLogger("shopbite:theme");

type FontFamilyOption = {
  name: string;
  provider: string;
  weights: number[];
  preload: boolean;
};

function registerFonts(preset: ThemePreset, nuxt: Nuxt) {
  const weights = new Map<string, Set<number>>();
  for (const font of [preset.fonts.display, preset.fonts.body]) {
    const set = weights.get(font.family) ?? new Set<number>();
    font.weights.forEach((weight) => set.add(weight));
    weights.set(font.family, set);
  }

  const options = nuxt.options as unknown as {
    fonts?: { families?: FontFamilyOption[] };
  };
  options.fonts ??= {};
  options.fonts.families ??= [];
  for (const [name, set] of weights) {
    if (options.fonts.families.some((family) => family.name === name)) {
      continue;
    }
    // @nuxt/fonts finds the families in the `--font-sb-*` properties; the
    // entry only pins the weights. No preload: the module would preload one
    // weight only, and on phones a preload delays the first paint (#431).
    options.fonts.families.push({
      name,
      provider: "google",
      weights: [...set].sort((a, b) => a - b),
      preload: false,
    });
  }
}

/**
 * Style presets (#439, #445): writes the stylesheets of all presets into the
 * build (each scoped to `:root[data-preset=…]`, the `shopBite.colors`
 * overrides only on the configured one), registers their fonts with
 * @nuxt/fonts (so nuxt.config.ts lists this module before "@nuxt/fonts";
 * browsers download only the faces the active preset uses) and makes the
 * configured preset the default of `runtimeConfig.public.shopBite.themePreset`.
 * One build can so serve every preset: `NUXT_PUBLIC_SHOP_BITE_THEME_PRESET`
 * switches it at runtime (the lead demos run one image for all restaurants),
 * plugins/theme-preset.ts sets `data-preset` on `<html>`.
 */
export default defineNuxtModule<ShopBiteThemeOptions>({
  meta: { name: "shopbite-theme", configKey: "shopBite" },
  defaults: { preset: "trattoria", colors: {} },
  setup(options, nuxt) {
    const name =
      process.env.NUXT_SHOPBITE_PRESET || options.preset || "trattoria";
    if (!isThemePresetName(name)) {
      throw new Error(
        `[shopbite:theme] Unknown preset "${name}". Available: ${Object.keys(THEME_PRESETS).join(", ")}`,
      );
    }

    const presets = (Object.keys(THEME_PRESETS) as ThemePresetName[]).map(
      (key) => resolvePreset(key, key === name ? options.colors : {}),
    );
    for (const failure of contrastFailures(
      resolvePreset(name, options.colors).colors,
    )) {
      logger.warn(
        `Preset "${name}": ${failure.fg} on ${failure.bg} has a contrast of ${failure.ratio.toFixed(2)}:1, WCAG AA needs ${failure.min}:1. Check the colour overrides in shopBite.colors.`,
      );
    }

    const publicConfig = nuxt.options.runtimeConfig.public as Record<
      string,
      unknown
    >;
    const shopBite = (publicConfig.shopBite ??= {}) as Record<string, unknown>;
    shopBite.themePreset = name;
    // what the app needs to know about each preset, so app code imports
    // nothing from shared/ (a layer import would resolve in the shop)
    shopBite.themePresets = Object.fromEntries(
      presets.map((preset) => [
        preset.name,
        { menuView: preset.menuView, colorMode: preset.colorMode },
      ]),
    );
    // optional logo URL instead of public/light|dark/Logo.png
    shopBite.logoUrl ??= "";

    const template = addTemplate({
      filename: "shopbite-theme.css",
      getContents: () => presets.map((preset) => presetCss(preset)).join("\n"),
      write: true,
    });
    nuxt.options.css.push(template.dst);

    for (const preset of presets) registerFonts(preset, nuxt);
  },
});
