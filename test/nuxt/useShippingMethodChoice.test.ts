import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";

// The shop's shipping methods from the BFF (`ShippingMethod[]`, ADR 0001).
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
// read lazily by the mock, after module initialisation
const methods = ref<unknown>(null);

mockNuxtImport("useShippingMethods", () => () => ({
  shippingMethods: methods,
  refresh,
}));

describe("useShippingMethodChoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    methods.value = null;
    refresh.mockImplementation(async () => {
      methods.value = [
        { id: "delivery", name: "Lieferung", fulfillment: "delivery" },
        { id: "pickup", name: "Abholung", fulfillment: "pickup" },
      ];
    });
  });

  it("offers every active method of the shop, in the shop's order", async () => {
    // "Lieferung" in a shop with a delivery-area rule only matches with a
    // shipping city in the delivery area: it is offered anyway
    const choice = useShippingMethodChoice();
    await choice.load({ forceReload: true });

    expect(choice.methods.value.map((method) => method.name)).toEqual([
      "Lieferung",
      "Abholung",
    ]);
  });

  it("does not reload once loaded", async () => {
    const { load } = useShippingMethodChoice();
    await load();
    await load();

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
