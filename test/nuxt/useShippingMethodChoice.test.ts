import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mockInvoke },
}));

describe("useShippingMethodChoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: {
        elements: [
          { id: "pickup", name: "Abholung", position: 2 },
          { id: "delivery", name: "Lieferung", position: 1 },
        ],
      },
    });
  });

  it("loads all active methods, also those whose rule needs an address", async () => {
    // "Lieferung" at La Fattoria only matches with a shipping city in the
    // delivery area; onlyAvailable hid it from guests without an address
    const { methods, load } = useShippingMethodChoice();
    await load({ forceReload: true });

    expect(mockInvoke).toHaveBeenCalledWith(
      "readShippingMethod post /shipping-method",
      expect.objectContaining({ query: { onlyAvailable: false } }),
    );
    expect(methods.value.map((method) => method.name)).toEqual([
      "Lieferung",
      "Abholung",
    ]);
  });

  it("does not reload once loaded", async () => {
    const { load } = useShippingMethodChoice();
    await load({ forceReload: true });
    await load();

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
