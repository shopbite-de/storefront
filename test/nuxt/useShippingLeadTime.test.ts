import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useShippingLeadTime } from "~/composables/useShippingLeadTime";

// The checkout's time choice follows the selected shipping method
// (shopbite#6).
const DELIVERY = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5b";
const PICKUP = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5c";

const { selected } = vi.hoisted(() => ({
  selected: {
    current: null as null | { value: unknown },
  },
}));

mockNuxtImport("useCheckout", () => () => ({
  selectedShippingMethod: selected.current,
}));

const configData = ref<unknown>(null);
mockNuxtImport(
  "useAsyncData",
  () => (_key: string, fetcher: () => Promise<unknown>) => ({
    data: configData,
    refresh: async () => {
      configData.value = await fetcher();
    },
  }),
);

describe("useShippingLeadTime", () => {
  beforeEach(() => {
    configData.value = null;
    selected.current = ref({ id: DELIVERY, name: "Lieferung" });
  });

  it("switches between delivery and pickup with the shipping method", async () => {
    configData.value = [
      { id: DELIVERY, fulfillment: "delivery", leadTime: { minutes: 45 } },
      { id: PICKUP, fulfillment: "pickup", leadTime: { minutes: 20 } },
    ];

    const { fulfillment, leadTime } = useShippingLeadTime();
    expect(fulfillment.value).toBe("delivery");
    expect(leadTime.value).toBe(45);

    selected.current!.value = { id: PICKUP, name: "Abholung" };
    expect(fulfillment.value).toBe("pickup");
    expect(leadTime.value).toBe(20);
  });

  it("defaults to delivery without a lead time before the shipping methods are loaded", () => {
    const { fulfillment, leadTime } = useShippingLeadTime();
    expect(fulfillment.value).toBe("delivery");
    expect(leadTime.value).toBeNull();
  });
});
