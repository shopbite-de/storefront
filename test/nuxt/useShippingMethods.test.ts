import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useShippingMethods } from "~/composables/useShippingMethods";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));

mockNuxtImport("loadShopData", () => load);

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

// shopbite#6: lead time per shipping method
const DELIVERY = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5b";
const PICKUP = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5c";
const method = (id: string, fulfillment: string, minutes: number | null) => ({
  id,
  name: id,
  description: null,
  fulfillment,
  leadTime: minutes === null ? null : { minutes },
  media: null,
});

describe("useShippingMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has no lead times before the methods are loaded", () => {
    const { deliveryTime, pickupTime, leadTimeFor } = useShippingMethods();
    expect(deliveryTime.value).toBeNull();
    expect(pickupTime.value).toBeNull();
    expect(leadTimeFor(DELIVERY)).toEqual({
      fulfillment: "delivery",
      minutes: null,
    });
  });

  it("passes the lead times of the shipping methods through", async () => {
    load.mockResolvedValue([
      method(DELIVERY, "delivery", 50),
      method(PICKUP, "pickup", 15),
    ]);
    const { refresh, deliveryTime, pickupTime, leadTimeFor } =
      useShippingMethods();
    await refresh();

    expect(load).toHaveBeenCalledWith("/api/checkout/shipping-methods", true);
    expect(deliveryTime.value).toBe(50);
    expect(pickupTime.value).toBe(15);
    expect(leadTimeFor(PICKUP)).toEqual({ fulfillment: "pickup", minutes: 15 });
  });

  it("has no delivery time without a delivery method", async () => {
    load.mockResolvedValue([method(PICKUP, "pickup", 15)]);
    const { refresh, deliveryTime, pickupTime } = useShippingMethods();
    await refresh();

    expect(deliveryTime.value).toBeNull();
    expect(pickupTime.value).toBe(15);
  });
});
