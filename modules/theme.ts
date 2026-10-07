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
   * Style preset of the shop (#439): "trattoria", "grill" or "asia". Empty
   * keeps the current Nuxt UI look, so shops opt in one by one. The
   * `NUXT_SHOPBITE_PRESET` build environment variable takes precedence.
   */
  preset?: ThemePresetName | "";
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
 * Applies the style preset chosen in `shopBite.preset` (#439): writes the
 * preset's stylesheet into the build, sets `data-preset` on `<html>` and the
 * colour mode, and registers the preset fonts with @nuxt/fonts. It must run
 * before @nuxt/ui, which reads the colour mode options when it installs
 * @nuxtjs/color-mode, so nuxt.config.ts lists it before "@nuxt/ui".
 */
export default defineNuxtModule<ShopBiteThemeOptions>({
  meta: { name: "shopbite-theme", configKey: "shopBite" },
  defaults: { preset: "", colors: {} },
  setup(options, nuxt) {
    const name = process.env.NUXT_SHOPBITE_PRESET || options.preset;
    const publicConfig = nuxt.options.runtimeConfig.public as Record<
      string,
      unknown
    >;
    // Read by useThemePreset(); empty without a preset (old look).
    publicConfig.shopBiteTheme = { preset: "", menuView: "" };
    if (!name) return;
    if (!isThemePresetName(name)) {
      throw new Error(
        `[shopbite:theme] Unknown preset "${name}". Available: ${Object.keys(THEME_PRESETS).join(", ")}`,
      );
    }

    const preset = resolvePreset(name, options.colors);
    publicConfig.shopBiteTheme = { preset: name, menuView: preset.menuView };
    for (const failure of contrastFailures(preset.colors)) {
      logger.warn(
        `Preset "${name}": ${failure.fg} on ${failure.bg} has a contrast of ${failure.ratio.toFixed(2)}:1, WCAG AA needs ${failure.min}:1. Check the colour overrides in shopBite.colors.`,
      );
    }

    const template = addTemplate({
      filename: "shopbite-theme.css",
      getContents: () => presetCss(preset),
      write: true,
    });
    nuxt.options.css.push(template.dst);

    const head = nuxt.options.app.head;
    head.htmlAttrs = { ...head.htmlAttrs, "data-preset": name };

    const config = nuxt.options as unknown as {
      colorMode?: Record<string, unknown>;
    };
    config.colorMode = {
      ...config.colorMode,
      preference: preset.colorMode,
      fallback: preset.colorMode,
    };

    registerFonts(preset, nuxt);
  },
});
