import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { getQuery, type H3Event } from "h3";
import { defineComponent, h } from "vue";
import { HOLIDAYS_KEY } from "~/composables/useHolidays";
import { useLiveShopData } from "~/composables/useLiveShopData";
import { OPENING_HOURS_KEY } from "~/composables/useOpeningHours";
import { loadShopData } from "~/composables/useShopData";
import { SHIPPING_METHODS_KEY } from "~/composables/useShippingMethods";
import { SHOP_CONFIG_KEY } from "~/composables/useShopConfig";

const { mockRefreshNuxtData, route } = vi.hoisted(() => ({
  mockRefreshNuxtData: vi.fn(),
  route: vi.fn(),
}));

mockNuxtImport("refreshNuxtData", () => mockRefreshNuxtData);

registerEndpoint("/api/shop/config", (event: H3Event) =>
  route(getQuery(event)),
);

describe("restaurant operations through the BFF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders from the server's cache, the browser asks for the live value", async () => {
    route.mockImplementation((query: Record<string, string>) => ({
      acceptsOrders: query.fresh === "1",
    }));

    expect(await loadShopData("/api/shop/config", false)).toEqual({
      acceptsOrders: false,
    });
    expect(await loadShopData("/api/shop/config", true)).toEqual({
      acceptsOrders: true,
    });
    expect(route).toHaveBeenNthCalledWith(1, {});
    expect(route).toHaveBeenNthCalledWith(2, { fresh: "1" });
  });

  it("retries the live value in the browser like the opening hours", async () => {
    route
      .mockImplementationOnce(() => {
        throw new Error("offline");
      })
      .mockReturnValue({ acceptsOrders: true });

    expect(await loadShopData("/api/shop/config", true, [0])).toEqual({
      acceptsOrders: true,
    });
    // once per attempt: no hidden retries of ofetch on top
    expect(route).toHaveBeenCalledTimes(2);
  });
});

describe("useLiveShopData", () => {
  it("reloads the restaurant operations live after hydration", async () => {
    await mountSuspended(
      defineComponent({
        setup() {
          useLiveShopData();
          return () => h("div");
        },
      }),
    );

    // refreshNuxtData waits for the end of hydration; a refresh() during
    // hydration would return the server's (cached) payload
    expect(mockRefreshNuxtData).toHaveBeenCalledWith([
      SHOP_CONFIG_KEY,
      OPENING_HOURS_KEY,
      HOLIDAYS_KEY,
      SHIPPING_METHODS_KEY,
    ]);
  });
});
