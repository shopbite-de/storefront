import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useShopBiteConfig } from "~/composables/useShopBiteConfig";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("$fetch", mockFetch);

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
    mockFetch.mockResolvedValue({
      deliveryTime: 45,
      isCheckoutEnabled: true,
    });

    const { refresh, deliveryTime, isCheckoutEnabled } = useShopBiteConfig();
    await refresh();

    expect(mockFetch).toHaveBeenCalledWith("/api/shopbite/config");
    expect(deliveryTime.value).toBe(45);
    expect(isCheckoutEnabled.value).toBe(true);
  });
});
