import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useDeliveryTime } from "~/composables/useDeliveryTime";

const { mockDeliveryTime } = vi.hoisted(() => ({
  mockDeliveryTime: { value: 45 }, // Use object to keep reference
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  deliveryTime: mockDeliveryTime,
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
    expect(validate("invalid")).toBe("Bitte eine gültige Uhrzeit im Format HH:MM eingeben.");
  });

  it("should return error for time before minTime", () => {
    const { validate, minTime } = useDeliveryTime(now);
    if (minTime.value) {
      // Assuming minTime is something like "12:30"
      const [hours, mins] = minTime.value.split(":").map(Number);
      const earlyTime = new Date(now.value);
      earlyTime.setHours(hours as number);
      earlyTime.setMinutes(mins as number - 5);
      const earlyTimeStr = earlyTime.getHours().toString().padStart(2, '0') + ":" + earlyTime.getMinutes().toString().padStart(2, '0');
      
      expect(validate(earlyTimeStr)).toContain("vor dem frühestmöglichen Zeitpunkt");
    }
  });
});
