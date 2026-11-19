import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import DeliveryTimeSelect from "~/components/Checkout/DeliveryTimeSelect.vue";

// The time field follows the selected shipping method (shopbite#6):
// lead time and wording of delivery or pickup.
const { lead } = vi.hoisted(() => ({
  lead: {
    fulfillment: "delivery" as "delivery" | "pickup",
    leadTime: 45 as number | null,
  },
}));

mockNuxtImport("useShippingLeadTime", () => () => ({
  fulfillment: ref(lead.fulfillment),
  leadTime: ref(lead.leadTime),
}));

mockNuxtImport("useOpeningHoursData", () => () => ({
  isLoaded: ref(true),
  hasFailed: ref(false),
  retry: vi.fn(),
}));

mockNuxtImport("useHolidays", () => () => ({
  isClosedHoliday: () => false,
}));

// Today's only interval ended an hour ago: no times are left.
mockNuxtImport("useBusinessHours", () => () => {
  const interval = () => {
    const end = new Date(Date.now() - 60 * 60_000);
    return { start: new Date(end.getTime() - 60 * 60_000), end };
  };
  return {
    businessHours: ref([
      {
        dayOfWeek: new Date().getDay(),
        openingTime: "00:00",
        closingTime: "00:01",
      },
    ]),
    getServiceIntervals: () => [interval()],
    getEarliestSelectableTime: (now: Date, minutes: number) =>
      new Date(now.getTime() + minutes * 60_000),
    findActiveInterval: () => null,
  };
});

async function mountSelect() {
  return await mountSuspended(DeliveryTimeSelect);
}

describe("DeliveryTimeSelect wording per fulfillment", () => {
  beforeEach(() => {
    lead.fulfillment = "delivery";
    lead.leadTime = 45;
  });

  it("asks for the delivery time with the delivery lead time", async () => {
    const wrapper = await mountSelect();
    const text = wrapper.text();

    expect(wrapper.get("label").text()).toContain("Wunschlieferzeit");
    expect(text).toContain("Lieferzeit ca. 45 Minuten");
    expect(text).toContain("Heute sind keine Lieferzeiten mehr verfügbar.");
    expect(text).not.toContain("Abhol");
  });

  it("asks for the pickup time with the pickup lead time", async () => {
    lead.fulfillment = "pickup";
    lead.leadTime = 20;

    const wrapper = await mountSelect();
    const text = wrapper.text();

    expect(wrapper.get("label").text()).toContain("Wunschabholzeit");
    expect(text).toContain("Abholbereit in ca. 20 Minuten");
    expect(text).toContain("Heute sind keine Abholzeiten mehr verfügbar.");
    expect(text).not.toContain("Lieferzeit");
  });

  it("leaves out the lead time hint while it is unknown", async () => {
    lead.leadTime = null;

    const wrapper = await mountSelect();

    expect(wrapper.text()).not.toContain("ca.");
  });
});
