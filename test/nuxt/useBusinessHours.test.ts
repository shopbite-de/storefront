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
});
