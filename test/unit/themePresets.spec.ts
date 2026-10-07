import { describe, it, expect } from "vitest";
import {
  contrastFailures,
  contrastRatio,
  isThemePresetName,
  presetCss,
  resolvePreset,
  THEME_PRESETS,
} from "../../shared/theme/presets";

describe("theme presets", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // order of the arguments does not matter
    expect(contrastRatio("#3F7D20", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#3F7D20"),
      10,
    );
  });

  it.each(Object.keys(THEME_PRESETS))(
    "preset %s passes every contrast pair (WCAG AA)",
    (name) => {
      const preset = THEME_PRESETS[name as keyof typeof THEME_PRESETS];
      expect(contrastFailures(preset.colors)).toEqual([]);
    },
  );

  it("reports overrides that break a contrast pair", () => {
    const preset = resolvePreset("trattoria", { primary: "#9CCB7E" });
    expect(contrastFailures(preset.colors)).toContainEqual(
      expect.objectContaining({ fg: "onPrimary", bg: "primary", min: 4.5 }),
    );
  });

  it("applies colour overrides without changing the preset", () => {
    const preset = resolvePreset("trattoria", { primary: "#2E6B1A" });
    expect(preset.colors.primary).toBe("#2E6B1A");
    expect(preset.colors.bg).toBe(THEME_PRESETS.trattoria.colors.bg);
    expect(THEME_PRESETS.trattoria.colors.primary).toBe("#3F7D20");
  });

  it("knows the preset names", () => {
    expect(isThemePresetName("grill")).toBe(true);
    expect(isThemePresetName("toString")).toBe(false);
    expect(isThemePresetName("")).toBe(false);
  });

  it("scopes the stylesheet to the preset and bridges Nuxt UI", () => {
    const css = presetCss(resolvePreset("grill"));
    expect(css).toContain(':root[data-preset="grill"] {');
    expect(css).toContain("--sb-primary-tint: #3A2E1E;");
    expect(css).toContain(
      '--font-sb-display: "Bricolage Grotesque", sans-serif;',
    );
    expect(css).toContain("--ui-primary: var(--sb-primary);");
    expect(css).toContain("color-scheme: dark;");
  });
});
