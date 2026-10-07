/**
 * Style presets of the storefront (#439). A preset gives a shop its look:
 * colours, fonts, shape and colour mode. The base components read only the
 * `--sb-*` custom properties, so switching `shopBite.preset` in a shop's
 * nuxt.config changes the whole storefront without code changes.
 *
 * Every colour pair a component puts on top of each other is listed in
 * `CONTRAST_PAIRS` and checked against WCAG 2.2 AA by
 * test/unit/themePresets.spec.ts (#446).
 */

export type ColorToken =
  /** page background */
  | "bg"
  /** cards, inputs, panels on top of bg */
  | "surface"
  /** darker bands and fills (number strips, segmented controls) */
  | "muted"
  /** hairlines and card borders, decorative only */
  | "line"
  /** visible boundary of inputs and outlined controls, 3:1 (WCAG 1.4.11) */
  | "control"
  /** body text and headings */
  | "ink"
  /** secondary text: ingredients, hints, captions */
  | "inkMuted"
  /** primary buttons, selected states */
  | "primary"
  | "primaryHover"
  /** text and icons on primary */
  | "onPrimary"
  /** light fill of secondary buttons (quick add) */
  | "primaryTint"
  /** links and icons in the primary colour on light surfaces */
  | "primaryInk"
  /** headline accents and kickers, never on controls */
  | "accent"
  /** keyboard focus ring */
  | "focus"
  /** error text and borders */
  | "danger"
  /** rating stars, a graphic next to the rating in words (3:1) */
  | "star"
  /** inverted band (restaurant section) */
  | "band"
  | "onBand";

export type ThemeColors = Record<ColorToken, string>;

export interface ThemePreset {
  name: string;
  colorMode: "light" | "dark";
  colors: ThemeColors;
  fonts: {
    display: { family: string; weights: number[]; fallback: string };
    body: { family: string; weights: number[]; fallback: string };
  };
  radius: {
    /** cards and panels */
    card: string;
    /** buttons and inputs */
    control: string;
  };
  /** how dishes are shown in the menu (#441) */
  menuView: "bon" | "bonPhoto" | "listPhoto";
}

export const THEME_PRESETS = {
  trattoria: {
    name: "trattoria",
    colorMode: "light",
    colors: {
      bg: "#F5ECE6",
      surface: "#FBF7F4",
      muted: "#EBDFD6",
      line: "#E2D5CB",
      control: "#8F7C6E",
      ink: "#1C1B19",
      inkMuted: "#5E5B55",
      primary: "#3F7D20",
      primaryHover: "#346A1A",
      onPrimary: "#FFFFFF",
      primaryTint: "#DCE8D1",
      primaryInk: "#2F6418",
      accent: "#B03A2E",
      focus: "#2F6418",
      danger: "#B42318",
      star: "#B87A00",
      band: "#1F2A1B",
      onBand: "#FFFFFF",
    },
    fonts: {
      display: { family: "Young Serif", weights: [400], fallback: "serif" },
      body: {
        family: "Figtree",
        weights: [400, 600, 700],
        fallback: "sans-serif",
      },
    },
    radius: { card: "14px", control: "12px" },
    menuView: "bon",
  },
  grill: {
    name: "grill",
    colorMode: "dark",
    colors: {
      bg: "#16120E",
      surface: "#241D17",
      muted: "#2E261F",
      line: "#3A3128",
      control: "#8E8272",
      ink: "#F5EFE6",
      inkMuted: "#B3A996",
      primary: "#F2A93B",
      primaryHover: "#F5B957",
      onPrimary: "#16120E",
      primaryTint: "#3A2E1E",
      primaryInk: "#F2A93B",
      accent: "#F2A93B",
      focus: "#F2A93B",
      danger: "#FF8A7A",
      star: "#F2A93B",
      band: "#0F0C09",
      onBand: "#F5EFE6",
    },
    fonts: {
      display: {
        family: "Bricolage Grotesque",
        weights: [700, 800],
        fallback: "sans-serif",
      },
      body: {
        family: "Bricolage Grotesque",
        weights: [400, 600, 700],
        fallback: "sans-serif",
      },
    },
    radius: { card: "20px", control: "999px" },
    menuView: "bonPhoto",
  },
  asia: {
    name: "asia",
    colorMode: "light",
    colors: {
      bg: "#F3F6F1",
      surface: "#FFFFFF",
      muted: "#E6ECE3",
      line: "#D5DDD3",
      control: "#7C877F",
      ink: "#17201B",
      inkMuted: "#5C665F",
      primary: "#0E6B52",
      primaryHover: "#0B5A45",
      onPrimary: "#FFFFFF",
      primaryTint: "#E3F1EA",
      primaryInk: "#0E6B52",
      accent: "#B8391F",
      focus: "#0E6B52",
      danger: "#B42318",
      star: "#B87A00",
      band: "#17201B",
      onBand: "#FFFFFF",
    },
    fonts: {
      display: { family: "Outfit", weights: [600], fallback: "sans-serif" },
      body: {
        family: "Outfit",
        weights: [400, 500, 600],
        fallback: "sans-serif",
      },
    },
    radius: { card: "24px", control: "999px" },
    menuView: "listPhoto",
  },
} satisfies Record<string, ThemePreset>;

export type ThemePresetName = keyof typeof THEME_PRESETS;

export function isThemePresetName(name: unknown): name is ThemePresetName {
  return typeof name === "string" && Object.hasOwn(THEME_PRESETS, name);
}

export type ContrastPair = {
  fg: ColorToken;
  bg: ColorToken;
  /** 4.5 for text, 3 for large text, icons and control boundaries */
  min: 4.5 | 3;
};

/** Colour pairs the base components render; every preset must pass all. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  { fg: "ink", bg: "bg", min: 4.5 },
  { fg: "ink", bg: "surface", min: 4.5 },
  { fg: "ink", bg: "muted", min: 4.5 },
  { fg: "inkMuted", bg: "bg", min: 4.5 },
  { fg: "inkMuted", bg: "surface", min: 4.5 },
  { fg: "inkMuted", bg: "muted", min: 4.5 },
  { fg: "onPrimary", bg: "primary", min: 4.5 },
  { fg: "onPrimary", bg: "primaryHover", min: 4.5 },
  { fg: "primaryInk", bg: "bg", min: 4.5 },
  { fg: "primaryInk", bg: "surface", min: 4.5 },
  { fg: "primaryInk", bg: "primaryTint", min: 4.5 },
  { fg: "accent", bg: "bg", min: 4.5 },
  { fg: "accent", bg: "muted", min: 4.5 },
  { fg: "danger", bg: "surface", min: 4.5 },
  { fg: "onBand", bg: "band", min: 4.5 },
  { fg: "control", bg: "surface", min: 3 },
  { fg: "control", bg: "bg", min: 3 },
  { fg: "focus", bg: "bg", min: 3 },
  { fg: "focus", bg: "surface", min: 3 },
  { fg: "star", bg: "surface", min: 3 },
];

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#RRGGBB` colour (WCAG 2.2). */
export function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #RRGGBB colour, got "${hex}"`);
  const n = parseInt(match[1]!, 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

export type ContrastFailure = ContrastPair & { ratio: number };

export function contrastFailures(colors: ThemeColors): ContrastFailure[] {
  return CONTRAST_PAIRS.map((pair) => ({
    ...pair,
    ratio: contrastRatio(colors[pair.fg], colors[pair.bg]),
  })).filter((result) => result.ratio < result.min);
}

/** The preset with a shop's colour overrides applied. */
export function resolvePreset(
  name: ThemePresetName,
  colors: Partial<ThemeColors> = {},
): ThemePreset {
  const preset: ThemePreset = THEME_PRESETS[name];
  return { ...preset, colors: { ...preset.colors, ...colors } };
}

function kebab(token: string): string {
  return token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function fontStack(font: { family: string; fallback: string }): string {
  return `"${font.family}", ${font.fallback}`;
}

/**
 * The stylesheet of a preset: the `--sb-*` colour tokens, the fonts as
 * `--font-sb-*` (the `--font` prefix makes @nuxt/fonts resolve the families
 * and add metric fallback faces, which a `--sb-font-*` name would not get)
 * plus a bridge that maps
 * Nuxt UI's variables onto them, so components that still use Nuxt UI take
 * the preset's colours until they are replaced (#440, #445).
 */
export function presetCss(preset: ThemePreset): string {
  const scope = `:root[data-preset="${preset.name}"]`;
  const tokens = Object.entries(preset.colors).map(
    ([token, value]) => `  --sb-${kebab(token)}: ${value};`,
  );
  return `${scope} {
${tokens.join("\n")}
  --font-sb-display: ${fontStack(preset.fonts.display)};
  --font-sb-body: ${fontStack(preset.fonts.body)};
  --sb-radius-card: ${preset.radius.card};
  --sb-radius-control: ${preset.radius.control};
  color-scheme: ${preset.colorMode};

  --font-sans: var(--font-sb-body);
  --ui-primary: var(--sb-primary);
  --ui-bg: var(--sb-bg);
  --ui-bg-muted: var(--sb-muted);
  --ui-bg-elevated: var(--sb-surface);
  --ui-bg-accented: var(--sb-muted);
  --ui-bg-inverted: var(--sb-ink);
  --ui-border: var(--sb-line);
  --ui-border-muted: var(--sb-line);
  --ui-border-accented: var(--sb-control);
  --ui-border-inverted: var(--sb-ink);
  --ui-text: var(--sb-ink);
  --ui-text-highlighted: var(--sb-ink);
  --ui-text-toned: var(--sb-ink);
  --ui-text-muted: var(--sb-ink-muted);
  --ui-text-dimmed: var(--sb-ink-muted);
  --ui-text-inverted: var(--sb-surface);
  --ui-text-default: var(--sb-ink);
  --ui-text-accented: var(--sb-ink);
}

${scope} body {
  background: var(--sb-bg);
  color: var(--sb-ink);
  font-family: var(--font-sb-body);
}

${scope} :where(h1, h2, h3) {
  font-family: var(--font-sb-display);
  /* the display weight of the preset; a heavier utility class would make
     the browser synthesise bold from a single-weight face */
  font-weight: ${Math.max(...preset.fonts.display.weights)};
  font-synthesis: none;
}

${scope} :focus-visible {
  outline: 3px solid var(--sb-focus);
  outline-offset: 2px;
}
`;
}
