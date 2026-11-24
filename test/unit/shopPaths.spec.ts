import { describe, expect, it, vi } from "vitest";
import { resolveShopLocale } from "../../i18n/shopLocale";

// an English shop (modules/locale.ts writes this module per build)
vi.mock("#shopbite-locale", () => ({
  shopLocale: { ...resolveShopLocale({ locale: "en" }, {}), language: "en-GB" },
}));
vi.stubGlobal("useRuntimeConfig", () => ({
  public: { storeUrl: "https://shop.example/" },
}));

const { shopPath } = await import("../../server/utils/shopPaths");
const { paymentUrls } = await import("../../server/utils/checkoutRoutes");

describe("the server's links to the app's pages", () => {
  it("follow the shop's locale", () => {
    expect(shopPath("kontakt")).toBe("/contact");
    expect(paymentUrls("order 1")).toEqual({
      success: "https://shop.example/order/order%201/success",
      failure: "https://shop.example/order/order%201/payment-failed",
    });
  });
});
