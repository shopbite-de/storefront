import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { nextTick, ref, type Ref } from "vue";
import DeliveryTimeSelect from "~/components/Checkout/DeliveryTimeSelect.vue";

// The time field follows the selected shipping method (shopbite#6):
// lead time and wording of delivery or pickup.
const { lead } = vi.hoisted(() => ({
  lead: {
    fulfillment: "delivery" as "delivery" | "pickup",
    leadTime: 45 as number | null,
    // the refs of the mounted component, to switch the method
    current: null as null | {
      fulfillment: Ref<"delivery" | "pickup">;
      leadTime: Ref<number | null>;
    },
  },
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

/** Open 11:00 to 22:00 every day, in Berlin. */
const DAILY = {
  timeZone: "Europe/Berlin",
  openingHours: {
    intervals: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      interval: { opens: { minutes: 660 }, closes: { minutes: 1320 } },
    })),
  },
  holidays: [],
};

const { schedule } = vi.hoisted(() => ({
  schedule: { current: null as unknown },
}));

mockNuxtImport("useServiceSchedule", () => () => ({
  schedule: ref(schedule.current),
}));

async function mountSelect() {
  return await mountSuspended(DeliveryTimeSelect);
}

beforeEach(() => {
  schedule.current = DAILY;
});

describe("DeliveryTimeSelect wording per fulfillment", () => {
  beforeEach(() => {
    lead.fulfillment = "delivery";
    lead.leadTime = 45;
    // today's opening has ended: no times are left
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T23:00:00+01:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
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
    // 16:13 in Berlin, whatever the visitor's clock says
    vi.setSystemTime(new Date("2026-11-19T16:13:20+01:00"));
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

describe("DeliveryTimeSelect in a late-night opening", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Friday 23:50 in Berlin
    vi.setSystemTime(new Date("2026-11-20T23:50:00+01:00"));
    lead.fulfillment = "delivery";
    lead.leadTime = 30;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers times after midnight until the late-night opening closes", async () => {
    // Friday 17:00–24:00 and Saturday 00:00–01:30, as the domain keeps it
    schedule.current = {
      timeZone: "Europe/Berlin",
      openingHours: {
        intervals: [
          {
            weekday: 5,
            interval: { opens: { minutes: 1020 }, closes: { minutes: 1440 } },
          },
          {
            weekday: 6,
            interval: { opens: { minutes: 0 }, closes: { minutes: 90 } },
          },
        ],
      },
      holidays: [],
    };
    const wrapper = await mountSelect();
    const input = wrapper.get<HTMLInputElement>('input[type="time"]');

    expect(input.element.value).toBe("00:20");
    expect(input.attributes("min")).toBe("00:20");
    expect(input.attributes("max")).toBe("01:30");
    expect(wrapper.emitted("update:valid")!.at(-1)).toEqual([true]);
  });
});
