import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useShopBiteConfig } from "~/composables/useShopBiteConfig";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: {
    invoke: mockInvoke,
  },
}));

mockNuxtImport(
  "useAsyncData",
  () => (_key: string, fetcher: () => Promise<unknown>) => {
    const data = ref<unknown>(null);
    const refresh = async () => {
      data.value = await fetcher();
    };
    return { data, refresh };
  },
);

describe("useShopBiteConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return default values when no data is loaded", () => {
    const { deliveryTime, isCheckoutEnabled } = useShopBiteConfig();
    expect(deliveryTime.value).toBeNull();
    expect(isCheckoutEnabled.value).toBe(false);
  });

  it("should refresh values from API", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        isCheckoutEnabled: true,
        shippingMethods: [
          {
            id: "0190a3b0c1d27e0f8a9b0c1d2e3f4a5b",
            fulfillment: "delivery",
            leadTimeMinutes: 45,
          },
        ],
      },
    });

    const { refresh, deliveryTime, isCheckoutEnabled } = useShopBiteConfig();
    await refresh();

    expect(mockInvoke).toHaveBeenCalledWith(
      "shopbite.config.get get /shopbite/config",
    );
    expect(deliveryTime.value).toBe(45);
    expect(isCheckoutEnabled.value).toBe(true);
  });

  it("checks the checkout switch with Shopware before an order", async () => {
    mockInvoke.mockResolvedValue({
      data: { isCheckoutEnabled: false, shippingMethods: [] },
    });

    const { checkCheckoutEnabled, isCheckoutEnabled } = useShopBiteConfig();

    expect(await checkCheckoutEnabled()).toBe(false);
    expect(isCheckoutEnabled.value).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith(
      "shopbite.config.get get /shopbite/config",
    );
  });

  it("reports an unknown checkout switch when Shopware fails", async () => {
    mockInvoke.mockRejectedValue(new Error("offline"));

    const { checkCheckoutEnabled } = useShopBiteConfig();

    expect(await checkCheckoutEnabled([])).toBeNull();
  });

  // shopbite#6: lead time per shipping method
  const DELIVERY = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5b";
  const PICKUP = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5c";

  it("passes the lead times of the shipping methods through", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        isCheckoutEnabled: true,
        shippingMethods: [
          { id: DELIVERY, fulfillment: "delivery", leadTimeMinutes: 50 },
          { id: PICKUP, fulfillment: "pickup", leadTimeMinutes: 15 },
        ],
      },
    });

    const { refresh, deliveryTime, pickupTime, leadTimeFor } =
      useShopBiteConfig();
    await refresh();

    expect(deliveryTime.value).toBe(50);
    expect(pickupTime.value).toBe(15);
    expect(leadTimeFor({ id: PICKUP })).toEqual({
      fulfillment: "pickup",
      minutes: 15,
    });
    expect(leadTimeFor({ id: DELIVERY })).toEqual({
      fulfillment: "delivery",
      minutes: 50,
    });
  });

  it("has no delivery time without a delivery method", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        isCheckoutEnabled: true,
        shippingMethods: [
          { id: PICKUP, fulfillment: "pickup", leadTimeMinutes: 15 },
        ],
      },
    });

    const { refresh, deliveryTime, pickupTime } = useShopBiteConfig();
    await refresh();

    expect(deliveryTime.value).toBeNull();
    expect(pickupTime.value).toBe(15);
  });
});
