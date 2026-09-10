import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useStoreStatus } from "../../app/composables/useStoreStatus";

const { state } = vi.hoisted(() => ({
  state: {
    businessHours: null as null | object[],
    holidays: null as null | object[],
    open: false,
    intervals: [] as { start: Date; end: Date }[],
    nextOpening: null as string | null,
  },
}));

mockNuxtImport("useBusinessHours", () => () => ({
  businessHours: ref(state.businessHours),
  getServiceIntervals: () => state.intervals,
  isStoreOpen: () => state.open,
  getNextOpeningTime: () => state.nextOpening,
}));

mockNuxtImport("useHolidays", () => () => ({
  holidays: ref(state.holidays),
  isClosedHoliday: () => false,
}));

const at = (hours: number, minutes = 0) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

describe("useStoreStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(at(12, 30));
    state.businessHours = [{}];
    state.holidays = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is unknown until business hours and holidays are loaded", () => {
    state.businessHours = null;
    expect(useStoreStatus().status.value).toBeNull();

    state.businessHours = [{}];
    state.holidays = null;
    expect(useStoreStatus().status.value).toBeNull();
  });

  it("reports the closing time of the current interval when open", () => {
    state.open = true;
    state.intervals = [
      { start: at(11, 30), end: at(14, 30) },
      { start: at(17, 30), end: at(23, 0) },
    ];

    expect(useStoreStatus().status.value).toEqual({
      open: true,
      closesAt: "14:30",
    });
  });

  it("reports the next opening when closed", () => {
    state.open = false;
    state.nextOpening = "17:30 Uhr";

    expect(useStoreStatus().status.value).toEqual({
      open: false,
      nextOpening: "17:30 Uhr",
    });
  });
});
