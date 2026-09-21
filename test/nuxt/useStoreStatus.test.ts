import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { defineComponent, ref } from "vue";
import type { Ref } from "vue";
import {
  useStoreStatus,
  type StoreStatus,
} from "../../app/composables/useStoreStatus";

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

// The status needs a mounted component: the clock starts in onMounted.
async function mountStatus() {
  let status!: Ref<StoreStatus | null>;
  let statusDuringSetup: StoreStatus | null | undefined;
  await mountSuspended(
    defineComponent({
      setup() {
        status = useStoreStatus().status;
        statusDuringSetup = status.value;
        return () => null;
      },
    }),
  );
  return { status, statusDuringSetup };
}

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

  it("is unknown until business hours and holidays are loaded", async () => {
    state.businessHours = null;
    expect((await mountStatus()).status.value).toBeNull();

    state.businessHours = [{}];
    state.holidays = null;
    expect((await mountStatus()).status.value).toBeNull();
  });

  it("is unknown before the component is mounted, like on the server", async () => {
    state.open = true;
    state.intervals = [{ start: at(11, 30), end: at(14, 30) }];

    const { status, statusDuringSetup } = await mountStatus();

    expect(statusDuringSetup).toBeNull();
    expect(status.value).toEqual({ open: true, closesAt: "14:30" });
  });

  it("reports the closing time of the current interval when open", async () => {
    state.open = true;
    state.intervals = [
      { start: at(11, 30), end: at(14, 30) },
      { start: at(17, 30), end: at(23, 0) },
    ];

    expect((await mountStatus()).status.value).toEqual({
      open: true,
      closesAt: "14:30",
    });
  });

  it("reports the next opening when closed", async () => {
    state.open = false;
    state.nextOpening = "17:30 Uhr";

    expect((await mountStatus()).status.value).toEqual({
      open: false,
      nextOpening: "17:30 Uhr",
    });
  });
});
