import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";
import {
  loadShopBiteConfig,
  SHOPBITE_CONFIG_KEY,
} from "~/composables/useShopBiteConfig";
import {
  BUSINESS_HOURS_KEY,
  loadBusinessHours,
} from "~/composables/useBusinessHours";
import { HOLIDAYS_KEY, loadHolidays } from "~/composables/useHolidays";
import { useLiveShopData } from "~/composables/useLiveShopData";

const { mockRefreshNuxtData, cached } = vi.hoisted(() => ({
  mockRefreshNuxtData: vi.fn(),
  cached: {
    config: vi.fn(),
    hours: vi.fn(),
    holidays: vi.fn(),
  },
}));

mockNuxtImport("refreshNuxtData", () => mockRefreshNuxtData);

registerEndpoint("/api/shopbite/config", () => cached.config());
registerEndpoint("/api/shopbite/business-hours", () => cached.hours());
registerEndpoint("/api/shopbite/holidays", () => cached.holidays());

const invoke = vi.fn();
const apiClient = { invoke } as unknown as Parameters<
  typeof loadShopBiteConfig
>[0];

describe("shop data sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the config from the server cache, the browser asks Shopware", async () => {
    cached.config.mockReturnValue({ isCheckoutEnabled: false });
    invoke.mockResolvedValue({ data: { isCheckoutEnabled: true } });

    expect(await loadShopBiteConfig(apiClient, true)).toEqual({
      isCheckoutEnabled: false,
    });
    expect(invoke).not.toHaveBeenCalled();

    expect(await loadShopBiteConfig(apiClient, false)).toEqual({
      isCheckoutEnabled: true,
    });
    expect(invoke).toHaveBeenCalledWith(
      "shopbite.config.get get /shopbite/config",
    );
  });

  it("retries the config in the browser like the opening hours", async () => {
    invoke
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ data: { isCheckoutEnabled: true } });

    expect(await loadShopBiteConfig(apiClient, false, [0])).toEqual({
      isCheckoutEnabled: true,
    });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("reads business hours and holidays from the cache on the server", async () => {
    const hours = [{ dayOfWeek: 1, openingTime: "11:00" }];
    const holidays = [{ start: "2026-12-24", end: "2026-12-26" }];
    cached.hours.mockReturnValue({ businessHours: hours });
    cached.holidays.mockReturnValue({ holidays });

    expect(await loadBusinessHours(apiClient, true)).toEqual(hours);
    expect(await loadHolidays(apiClient, true)).toEqual(holidays);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("asks Shopware for business hours and holidays in the browser", async () => {
    invoke.mockImplementation(async (operation: string) =>
      operation.includes("business-hour")
        ? { data: { businessHours: ["h"] } }
        : { data: { holidays: ["d"] } },
    );

    expect(await loadBusinessHours(apiClient, false, [])).toEqual(["h"]);
    expect(await loadHolidays(apiClient, false, [])).toEqual(["d"]);
  });
});

describe("useLiveShopData", () => {
  it("reloads config, hours and holidays from Shopware after hydration", async () => {
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
      SHOPBITE_CONFIG_KEY,
      BUSINESS_HOURS_KEY,
      HOLIDAYS_KEY,
    ]);
  });
});
