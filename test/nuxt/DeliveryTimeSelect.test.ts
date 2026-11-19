import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { nextTick, ref, type Ref } from "vue";
import DeliveryTimeSelect from "~/components/Checkout/DeliveryTimeSelect.vue";

// The time field follows the selected shipping method (shopbite#6):
// lead time and wording of delivery or pickup.
const { lead, hours } = vi.hoisted(() => ({
  lead: {
    fulfillment: "delivery" as "delivery" | "pickup",
    leadTime: 45 as number | null,
    // the refs of the mounted component, to switch the method
    current: null as null | {
      fulfillment: Ref<"delivery" | "pickup">;
      leadTime: Ref<number | null>;
    },
  },
  // "past": today's only interval has ended; "open": 11:00 to 22:00
  hours: { mode: "past" as "past" | "open" },
}));

mockNuxtImport("useShippingLeadTime", () => () => {
  lead.current = {
    fulfillment: ref(lead.fulfillment),
    leadTime: ref(lead.leadTime),
  };
  return lead.current;
});

mockNuxtImport("useOpeningHoursData", () => () => ({
  isLoaded: ref(true),
  hasFailed: ref(false),
  retry: vi.fn(),
}));

mockNuxtImport("useHolidays", () => () => ({
  isClosedHoliday: () => false,
}));

// "past": today's only interval ended an hour ago, no times are left.
mockNuxtImport("useBusinessHours", () => () => {
  const interval = (date: Date) => {
    if (hours.mode === "open") {
      const start = new Date(date);
      start.setHours(11, 0, 0, 0);
      const end = new Date(date);
      end.setHours(22, 0, 0, 0);
      return { start, end };
    }
    const end = new Date(Date.now() - 60 * 60_000);
    return { start: new Date(end.getTime() - 60 * 60_000), end };
  };
  const getEarliestSelectableTime = (now: Date, minutes: number | null) => {
    const earliest = new Date(now.getTime() + (minutes ?? 30) * 60_000);
    earliest.setSeconds(0, 0);
    return earliest;
  };
  return {
    businessHours: ref([
      {
        dayOfWeek: new Date().getDay(),
        openingTime: "00:00",
        closingTime: "00:01",
      },
    ]),
    getServiceIntervals: (date: Date) => [interval(date)],
    getEarliestSelectableTime,
    findActiveInterval: (now: Date, minutes: number | null) => {
      if (hours.mode === "past") return null;
      const current = interval(now);
      return getEarliestSelectableTime(now, minutes) <= current.end
        ? current
        : null;
    },
  };
});

async function mountSelect() {
  return await mountSuspended(DeliveryTimeSelect);
}

describe("DeliveryTimeSelect wording per fulfillment", () => {
  beforeEach(() => {
    lead.fulfillment = "delivery";
    lead.leadTime = 45;
    hours.mode = "past";
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

// Switching the shipping method moves the time to a valid 5-minute slot.
describe("DeliveryTimeSelect after a shipping method switch", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 16, 13, 20));
    hours.mode = "open";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function switchTo(fulfillment: "delivery" | "pickup", minutes: number) {
    lead.current!.fulfillment.value = fulfillment;
    lead.current!.leadTime.value = minutes;
    await nextTick();
    await nextTick();
  }

  function timeInput(wrapper: Awaited<ReturnType<typeof mountSelect>>) {
    return wrapper.get<HTMLInputElement>('input[type="time"]');
  }

  it("moves a chosen pickup time to the next delivery slot", async () => {
    lead.fulfillment = "pickup";
    lead.leadTime = 15;
    const wrapper = await mountSelect();
    expect(timeInput(wrapper).element.value).toBe("16:30");
    await timeInput(wrapper).setValue("16:30");

    await switchTo("delivery", 30);

    expect(timeInput(wrapper).element.value).toBe("16:45");
    expect(wrapper.text()).not.toContain("5-Minuten-Schritten");
    expect(wrapper.emitted("update:valid")!.at(-1)).toEqual([true]);
  });

  it("moves the prefilled delivery time to the earlier pickup slot", async () => {
    lead.fulfillment = "delivery";
    lead.leadTime = 30;
    const wrapper = await mountSelect();
    expect(timeInput(wrapper).element.value).toBe("16:45");

    await switchTo("pickup", 15);

    expect(timeInput(wrapper).element.value).toBe("16:30");
    expect(wrapper.emitted("update:valid")!.at(-1)).toEqual([true]);
  });

  it("keeps a later time the guest chose", async () => {
    lead.fulfillment = "delivery";
    lead.leadTime = 30;
    const wrapper = await mountSelect();
    await timeInput(wrapper).setValue("18:00");

    await switchTo("pickup", 15);
    expect(timeInput(wrapper).element.value).toBe("18:00");
    await switchTo("delivery", 30);
    expect(timeInput(wrapper).element.value).toBe("18:00");
  });
});
