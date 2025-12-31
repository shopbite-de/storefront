import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useShopBiteConfig } from "~/composables/useShopBiteConfig";

const { mockInvoke, mockDeliveryTime, mockIsCheckoutEnabled } = vi.hoisted(
  () => ({
    mockInvoke: vi.fn(),
    mockDeliveryTime: { value: 0 },
    mockIsCheckoutEnabled: { value: false },
  }),
);

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: {
    invoke: mockInvoke,
  },
}));

mockNuxtImport("useContext", () => (key: string) => {
  if (key === "deliveryTime") return mockDeliveryTime;
  if (key === "isCheckoutActive") return mockIsCheckoutEnabled;
  return { value: null };
});

describe("useShopBiteConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeliveryTime.value = 0;
    mockIsCheckoutEnabled.value = false;
  });

  it("should initialize with values from context", () => {
    mockDeliveryTime.value = 30;
    mockIsCheckoutEnabled.value = true;
    const { deliveryTime, isCheckoutEnabled } = useShopBiteConfig();
    expect(deliveryTime.value).toBe(30);
    expect(isCheckoutEnabled.value).toBe(true);
  });

  it("should refresh values from API", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        deliveryTime: 45,
        isCheckoutEnabled: true,
      },
    });

    const { refresh, deliveryTime, isCheckoutEnabled } = useShopBiteConfig();
    await refresh();

    expect(mockInvoke).toHaveBeenCalledWith(
      "shopbite.config.get get /shopbite/config",
    );
    expect(deliveryTime.value).toBe(45);
    expect(isCheckoutEnabled.value).toBe(true);
    expect(mockDeliveryTime.value).toBe(45);
    expect(mockIsCheckoutEnabled.value).toBe(true);
  });
});
