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
    expect(deliveryTime.value).toBe(30);
    expect(isCheckoutEnabled.value).toBe(false);
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
  });
});
