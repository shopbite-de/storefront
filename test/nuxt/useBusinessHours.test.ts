import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useBusinessHours } from "~/composables/useBusinessHours";

// Mock useAsyncData
mockNuxtImport("useAsyncData", () => {
  return (key: string, handler: () => Promise<any>) => {
    const data = ref(null);
    const pending = ref(false);
    const refresh = vi.fn(async () => {
      data.value = await handler();
    });
    return { data, pending, refresh };
  };
});

const mockBusinessHoursData = [
  { dayOfWeek: 1, openingTime: "11:30", closingTime: "14:30" },
  { dayOfWeek: 1, openingTime: "17:30", closingTime: "23:00" },
  { dayOfWeek: 7, openingTime: "17:30", closingTime: "23:00" },
];

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: {
    invoke: vi.fn().mockResolvedValue({
      data: { businessHours: mockBusinessHoursData },
    }),
  },
}));

describe("useBusinessHours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should identify if store is open", async () => {
    const { isStoreOpen, refresh } = useBusinessHours();
    await refresh();

    const isClosedHoliday = vi.fn().mockReturnValue(false);

    // Monday at 12:00 (Open)
    const openTime = new Date("2023-10-23T12:00:00"); // Monday
    expect(isStoreOpen(openTime, isClosedHoliday)).toBe(true);

    // Monday at 15:00 (Closed - between intervals)
    const closedTime = new Date("2023-10-23T15:00:00");
    expect(isStoreOpen(closedTime, isClosedHoliday)).toBe(false);

    // Monday at 10:00 (Closed - before intervals)
    const beforeTime = new Date("2023-10-23T10:00:00");
    expect(isStoreOpen(beforeTime, isClosedHoliday)).toBe(false);

    // Holiday (Closed)
    isClosedHoliday.mockReturnValue(true);
    expect(isStoreOpen(openTime, isClosedHoliday)).toBe(false);
  });

  it("should handle Sunday (day 7) correctly", async () => {
    const { isStoreOpen, refresh } = useBusinessHours();
    await refresh();

    const isClosedHoliday = vi.fn().mockReturnValue(false);

    // 2026-01-04 is a Sunday
    const sundayOpenTime = new Date("2026-01-04T18:00:00");
    expect(isStoreOpen(sundayOpenTime, isClosedHoliday)).toBe(true);

    const sundayClosedTime = new Date("2026-01-04T12:00:00");
    expect(isStoreOpen(sundayClosedTime, isClosedHoliday)).toBe(false);
  });

  it("should return correct next opening time", async () => {
    const { getNextOpeningTime, refresh } = useBusinessHours();
    await refresh();

    const isClosedHoliday = vi.fn().mockReturnValue(false);

    // Sunday at 12:00 -> should open at 17:30 today
    const sundayNoon = ref(new Date("2026-01-04T12:00:00"));
    expect(getNextOpeningTime(sundayNoon, isClosedHoliday)).toBe("17:30 Uhr");

    // Sunday at 23:30 -> should open tomorrow (Monday) at 11:30
    const sundayNight = ref(new Date("2026-01-04T23:30:00"));
    expect(getNextOpeningTime(sundayNight, isClosedHoliday)).toBe(
      "morgen um 11:30 Uhr",
    );
  });

  it("should sort intervals correctly", async () => {
    const { getServiceIntervals, refresh } = useBusinessHours();
    await refresh();

    // Monday
    const monday = new Date("2023-10-23T10:00:00");
    const intervals = getServiceIntervals(monday);

    expect(intervals).toHaveLength(2);
    expect(intervals[0].start.getHours()).toBe(11);
    expect(intervals[1].start.getHours()).toBe(17);
    expect(intervals[0].start.getTime()).toBeLessThan(
      intervals[1].start.getTime(),
    );
  });
});
