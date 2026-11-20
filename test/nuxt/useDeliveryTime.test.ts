import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useDeliveryTime } from "~/composables/useDeliveryTime";

const { lead, state } = vi.hoisted(() => ({
  lead: {
    minutes: { value: 45 as number | null },
    fulfillment: { value: "delivery" as "delivery" | "pickup" },
  },
  state: { schedule: null as unknown },
}));

mockNuxtImport("useShippingLeadTime", () => () => ({
  leadTime: lead.minutes,
  fulfillment: lead.fulfillment,
}));

mockNuxtImport("useServiceSchedule", () => () => ({
  schedule: ref(state.schedule),
}));

const interval = (opens: string, closes: string) => {
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h! * 60 + m!;
  };
  return {
    opens: { minutes: minutes(opens) },
    closes: { minutes: minutes(closes) },
  };
};

/**
 * Berlin; closed on Tuesday; lunch and dinner on the other days, Saturday
 * dinner until 23:30, Friday night until 01:30 (split at midnight).
 */
const SCHEDULE = {
  timeZone: "Europe/Berlin",
  openingHours: {
    intervals: [
      ...[1, 3, 4, 5, 7].flatMap((weekday) => [
        { weekday, interval: interval("11:30", "14:30") },
        ...(weekday === 5
          ? []
          : [{ weekday, interval: interval("17:30", "23:00") }]),
      ]),
      { weekday: 5, interval: interval("17:30", "24:00") },
      { weekday: 6, interval: interval("00:00", "01:30") },
      { weekday: 6, interval: interval("17:30", "23:30") },
    ],
  },
  holidays: [] as { id: string; firstDay: string; lastDay: string }[],
};

// Berlin wall-clock time in November 2026 (UTC+1); the 18th is a Wednesday
const at = (day: number, time: string) =>
  ref(new Date(`2026-11-${day}T${time}:00+01:00`));

describe("useDeliveryTime", () => {
  beforeEach(() => {
    lead.minutes.value = 45;
    lead.fulfillment.value = "delivery";
    state.schedule = SCHEDULE;
  });

  // shopbite#6: the lead time of the selected shipping method
  it("starts at now plus the lead time of the selected shipping method", () => {
    lead.minutes.value = 20;
    const { minTime, maxTime, helperText } = useDeliveryTime(at(18, "12:00"));
    expect(minTime.value).toBe("12:20");
    expect(maxTime.value).toBe("14:30");
    expect(helperText.value).toBe(
      "Frühestmöglich ab 12:20 (heute), erlaubt: 11:30 – 14:30",
    );
  });

  it("assumes 30 minutes while the lead time is unknown", () => {
    lead.minutes.value = null;
    expect(useDeliveryTime(at(18, "12:00")).minTime.value).toBe("12:30");
  });

  it("offers the next span before it opens", () => {
    const { minTime, helperText, firstSlotTime } = useDeliveryTime(
      at(18, "15:00"),
    );
    expect(minTime.value).toBe("17:30");
    expect(firstSlotTime.value).toBe("17:30");
    expect(helperText.value).toBe("Nächster möglicher Zeitraum: 17:30 – 23:00");
  });

  it("speaks of pickup times for a pickup method", () => {
    lead.minutes.value = 30;
    const late = at(18, "22:45");
    lead.fulfillment.value = "pickup";
    expect(useDeliveryTime(late).helperText.value).toBe(
      "Heute sind keine Abholzeiten mehr verfügbar.",
    );
    lead.fulfillment.value = "delivery";
    expect(useDeliveryTime(late).helperText.value).toBe(
      "Heute sind keine Lieferzeiten mehr verfügbar.",
    );
  });

  it("names the weekly closing day", () => {
    const { isClosedToday, helperText } = useDeliveryTime(at(17, "12:00"));
    expect(isClosedToday.value).toBe(true);
    expect(helperText.value).toBe(
      "Heute (Dienstag) ist Ruhetag. Bitte an einem anderen Tag bestellen.",
    );
  });

  it("is closed on a holiday", () => {
    state.schedule = {
      ...SCHEDULE,
      holidays: [{ id: "h", firstDay: "2026-11-18", lastDay: "2026-11-18" }],
    };
    const { isHoliday, isClosedToday, helperText } = useDeliveryTime(
      at(18, "12:00"),
    );
    expect(isHoliday.value).toBe(true);
    expect(isClosedToday.value).toBe(true);
    expect(helperText.value).toBe("Wegen Betriebsferien geschlossen.");
  });

  it("decides by the restaurant's clock, not the visitor's", () => {
    // 12:00 in Berlin is 06:00 in New York, before lunch there
    state.schedule = { ...SCHEDULE, timeZone: "America/New_York" };
    const { minTime, helperText } = useDeliveryTime(at(18, "12:00"));
    expect(minTime.value).toBe("11:30");
    expect(helperText.value).toBe("Nächster möglicher Zeitraum: 11:30 – 14:30");
  });

  it("validates format, bounds and the 5-minute grid", () => {
    const { validate } = useDeliveryTime(at(18, "12:00"));
    expect(validate("12:45")).toBeNull();
    expect(validate("")).toBeNull();
    expect(validate("invalid")).toBe(
      "Bitte eine gültige Uhrzeit im Format HH:MM eingeben.",
    );
    expect(validate("12:40")).toBe(
      "Die Zeit liegt vor dem frühestmöglichen Zeitpunkt. Frühestens ab 12:45.",
    );
    expect(validate("15:00")).toBe(
      "Die Zeit liegt nach dem spätestmöglichen Zeitpunkt. Spätestens bis 14:30.",
    );
    expect(validate("12:47")).toBe(
      "Bitte eine Zeit in 5-Minuten-Schritten auswählen.",
    );
  });

  it("runs past midnight in a late-night opening", () => {
    lead.minutes.value = 30;
    const { minTime, maxTime, validate, helperText } = useDeliveryTime(
      at(20, "23:40"),
    );
    expect(minTime.value).toBe("00:10");
    expect(maxTime.value).toBe("01:30");
    expect(helperText.value).toBe(
      "Frühestmöglich ab 00:10, erlaubt: 17:30 – 01:30",
    );
    expect(validate("00:30")).toBeNull();
    expect(validate("23:55")).toContain("vor dem frühestmöglichen Zeitpunkt");
    expect(validate("02:00")).toContain("Spätestens bis 01:30");
  });

  it("serves the rest of last night's opening after midnight", () => {
    lead.minutes.value = 30;
    const { minTime, maxTime } = useDeliveryTime(at(21, "00:30"));
    expect(minTime.value).toBe("01:00");
    expect(maxTime.value).toBe("01:30");
  });

  it("moves a time into the window on the grid", () => {
    const { slotFor, isWithinWindow } = useDeliveryTime(at(18, "12:03"));
    // earliest 12:48
    expect(isWithinWindow("12:40")).toBe(false);
    expect(slotFor("12:40")).toBe("12:50");
    expect(slotFor("16:00")).toBe("14:30");
    expect(isWithinWindow("13:00")).toBe(true);
  });

  it("is loading until opening hours and holidays are there", () => {
    state.schedule = null;
    const { helperText, isHoliday } = useDeliveryTime(at(18, "12:00"));
    expect(helperText.value).toBe("Lade Informationen...");
    expect(isHoliday.value).toBeUndefined();
  });
});
