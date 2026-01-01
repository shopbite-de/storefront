import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useDeliveryTime } from "~/composables/useDeliveryTime";

const { mockDeliveryTime, mockBusinessHours, mockHolidays } = vi.hoisted(
  () => ({
    mockDeliveryTime: { value: 45 },
    mockBusinessHours: {
      value: [
        { dayOfWeek: 1, openingTime: "11:30", closingTime: "14:30" },
        { dayOfWeek: 1, openingTime: "17:30", closingTime: "23:00" },
        { dayOfWeek: 3, openingTime: "11:30", closingTime: "14:30" },
        { dayOfWeek: 3, openingTime: "17:30", closingTime: "23:00" },
        { dayOfWeek: 4, openingTime: "11:30", closingTime: "14:30" },
        { dayOfWeek: 4, openingTime: "17:30", closingTime: "23:00" },
        { dayOfWeek: 5, openingTime: "11:30", closingTime: "14:30" },
        { dayOfWeek: 5, openingTime: "17:30", closingTime: "23:00" },
        { dayOfWeek: 6, openingTime: "17:30", closingTime: "23:30" },
        { dayOfWeek: 0, openingTime: "11:30", closingTime: "14:30" },
        { dayOfWeek: 0, openingTime: "17:30", closingTime: "23:00" },
      ],
    },
    mockHolidays: { value: [] },
  }),
);

mockNuxtImport("useShopBiteConfig", () => () => ({
  deliveryTime: mockDeliveryTime,
}));

mockNuxtImport("useBusinessHours", () => () => ({
  businessHours: mockBusinessHours,
  getServiceIntervals: (date: Date) => {
    const dayOfWeek = date.getDay();
    return mockBusinessHours.value
      .filter((bh) => bh.dayOfWeek === dayOfWeek)
      .map((bh) => {
        const [startH, startM] = bh.openingTime.split(":").map(Number);
        const [endH, endM] = bh.closingTime.split(":").map(Number);
        const start = new Date(date);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(date);
        end.setHours(endH, endM, 0, 0);
        return { start, end };
      });
  },
  getEarliestSelectableTime: (
    currentTime: Date,
    currentDeliveryTime: number | null,
  ) => {
    const earliest = new Date(currentTime);
    earliest.setMinutes(earliest.getMinutes() + (currentDeliveryTime ?? 30));
    earliest.setSeconds(0, 0);
    return earliest;
  },
  findActiveInterval: (
    currentTime: Date,
    currentDeliveryTime: number | null,
  ) => {
    const intervals = [
      { dayOfWeek: 1, openingTime: "11:30", closingTime: "14:30" },
      { dayOfWeek: 1, openingTime: "17:30", closingTime: "23:00" },
      { dayOfWeek: 3, openingTime: "11:30", closingTime: "14:30" },
      { dayOfWeek: 3, openingTime: "17:30", closingTime: "23:00" },
      { dayOfWeek: 4, openingTime: "11:30", closingTime: "14:30" },
      { dayOfWeek: 4, openingTime: "17:30", closingTime: "23:00" },
      { dayOfWeek: 5, openingTime: "11:30", closingTime: "14:30" },
      { dayOfWeek: 5, openingTime: "17:30", closingTime: "23:00" },
      { dayOfWeek: 6, openingTime: "17:30", closingTime: "23:30" },
      { dayOfWeek: 0, openingTime: "11:30", closingTime: "14:30" },
      { dayOfWeek: 0, openingTime: "17:30", closingTime: "23:00" },
    ]
      .filter((bh) => bh.dayOfWeek === currentTime.getDay())
      .map((bh) => {
        const [startH, startM] = bh.openingTime.split(":").map(Number);
        const [endH, endM] = bh.closingTime.split(":").map(Number);
        const start = new Date(currentTime);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(currentTime);
        end.setHours(endH, endM, 0, 0);
        return { start, end };
      });

    const earliest = new Date(currentTime);
    earliest.setMinutes(earliest.getMinutes() + (currentDeliveryTime ?? 30));
    earliest.setSeconds(0, 0);

    if (intervals.length === 0) return null;
    const current = intervals.find(
      (i) => earliest >= i.start && earliest <= i.end,
    );
    if (current) return current;
    return intervals.find((i) => i.start > earliest) ?? null;
  },
}));

mockNuxtImport("useHolidays", () => () => ({
  isClosedHoliday: (date: Date) => {
    if (!mockHolidays.value) return undefined;
    const formattedDate = date.toISOString().split("T")[0];
    return mockHolidays.value.some((h: any) => {
      const start = h.start.split("T")[0];
      const end = h.end.split("T")[0];
      return formattedDate >= start && formattedDate <= end;
    });
  },
}));

describe("useDeliveryTime", () => {
  const now = ref(new Date("2023-10-27T12:00:00")); // A Friday

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate earliest selectable time", () => {
    mockDeliveryTime.value = 30;
    const { earliest } = useDeliveryTime(now);
    // 12:00 + 30 mins = 12:30
    expect(earliest.value.getHours()).toBe(12);
    expect(earliest.value.getMinutes()).toBe(30);
  });

  it("should identify if closed today (e.g., Tuesday)", () => {
    const tuesday = ref(new Date("2023-10-24T12:00:00"));
    const { isClosedToday, helperText } = useDeliveryTime(tuesday);
    expect(isClosedToday.value).toBe(true);
    expect(helperText.value).toContain("Dienstag");
  });

  it("should validate valid time", () => {
    const { validate, minTime, maxTime } = useDeliveryTime(now);
    if (minTime.value && maxTime.value) {
      expect(validate(minTime.value)).toBeNull();
    }
  });

  it("should return error for invalid format", () => {
    const { validate } = useDeliveryTime(now);
    expect(validate("invalid")).toBe(
      "Bitte eine gültige Uhrzeit im Format HH:MM eingeben.",
    );
  });

  it("should return error for time before minTime", () => {
    const { validate, minTime } = useDeliveryTime(now);
    if (minTime.value) {
      // Assuming minTime is something like "12:30"
      const [hours, mins] = minTime.value.split(":").map(Number);
      const earlyTime = new Date(now.value);
      earlyTime.setHours(hours as number);
      earlyTime.setMinutes((mins as number) - 5);
      const earlyTimeStr =
        earlyTime.getHours().toString().padStart(2, "0") +
        ":" +
        earlyTime.getMinutes().toString().padStart(2, "0");

      expect(validate(earlyTimeStr)).toContain(
        "vor dem frühestmöglichen Zeitpunkt",
      );
    }
  });

  it("should return loading message when holidays are not loaded", () => {
    mockHolidays.value = null;
    const { helperText } = useDeliveryTime(now);
    expect(helperText.value).toBe("Lade Informationen...");
    mockHolidays.value = []; // Reset for other tests
  });
});
