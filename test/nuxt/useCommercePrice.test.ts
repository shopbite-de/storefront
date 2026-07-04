import { describe, it, expect } from "vitest";
import { useCommercePrice } from "~/composables/useCommercePrice";

describe("useCommercePrice", () => {
  it("formats prices with the de-DE / EUR defaults", () => {
    const { getFormattedPrice } = useCommercePrice();

    // Intl uses a non-breaking space between amount and currency symbol
    expect(getFormattedPrice(8)).toBe("8,00\u00A0€");
    expect(getFormattedPrice(1234.5)).toBe("1.234,50\u00A0€");
  });

  it("returns an empty string for undefined values", () => {
    const { getFormattedPrice } = useCommercePrice();

    expect(getFormattedPrice(undefined)).toBe("");
  });

  it("formats string values numerically", () => {
    const { getFormattedPrice } = useCommercePrice();

    expect(getFormattedPrice("7.5")).toBe("7,50\u00A0€");
  });

  it("uses the shared config seeded via setPriceConfig", () => {
    const { setPriceConfig } = useCommercePrice();
    setPriceConfig({ currencyCode: "USD", localeCode: "en-US" });

    // A separate call site picks up the shared state
    const { getFormattedPrice } = useCommercePrice();
    expect(getFormattedPrice(8)).toBe("$8.00");

    setPriceConfig({ currencyCode: "EUR", localeCode: "de-DE" });
  });

  it("ignores empty values in setPriceConfig and keeps previous config", () => {
    const { setPriceConfig, getFormattedPrice } = useCommercePrice();
    setPriceConfig({ currencyCode: "", localeCode: undefined });

    expect(getFormattedPrice(8)).toBe("8,00\u00A0€");
  });

  it("accepts locale codes with non-canonical casing (Shopware sends de-De)", () => {
    const { getFormattedPrice } = useCommercePrice({ localeCode: "de-De" });

    expect(getFormattedPrice(8)).toBe("8,00\u00A0€");
  });

  it("lets per-call-site params override the shared config", () => {
    const { getFormattedPrice } = useCommercePrice({
      currencyCode: "USD",
      localeCode: "en-US",
    });

    expect(getFormattedPrice(8)).toBe("$8.00");
  });
});
