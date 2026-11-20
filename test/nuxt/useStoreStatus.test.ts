import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { defineComponent, ref } from "vue";
import type { Ref } from "vue";
import { useStoreStatus } from "../../app/composables/useStoreStatus";
import type { StoreStatus } from "../../app/utils/restaurantTime";

const { state } = vi.hoisted(() => ({
  state: { schedule: null as unknown },
}));

mockNuxtImport("useServiceSchedule", () => () => ({
  schedule: ref(state.schedule),
}));

const interval = (opens: number, closes: number) => ({
  opens: { minutes: opens },
  closes: { minutes: closes },
});

/** Lunch 11:30–14:30 and dinner 17:30–23:00 every day, in Berlin. */
const BERLIN = {
  timeZone: "Europe/Berlin",
  openingHours: {
    intervals: [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) => [
      { weekday, interval: interval(690, 870) },
      { weekday, interval: interval(1050, 1380) },
    ]),
  },
  holidays: [],
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
    // 12:30 in Berlin
    vi.setSystemTime(new Date("2026-11-18T12:30:00+01:00"));
    state.schedule = BERLIN;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is unknown until opening hours and holidays are loaded", async () => {
    state.schedule = null;
    expect((await mountStatus()).status.value).toBeNull();
  });

  it("is unknown before the component is mounted, like on the server", async () => {
    const { status, statusDuringSetup } = await mountStatus();

    expect(statusDuringSetup).toBeNull();
    expect(status.value).toEqual({ open: true, closesAt: "14:30" });
  });

  it("reports the next opening when closed", async () => {
    vi.setSystemTime(new Date("2026-11-18T15:00:00+01:00"));

    expect((await mountStatus()).status.value).toEqual({
      open: false,
      nextOpening: "17:30 Uhr",
    });
  });

  it("goes by the restaurant's time zone", async () => {
    // 12:30 in Berlin is 06:30 in New York: closed there
    state.schedule = { ...BERLIN, timeZone: "America/New_York" };

    expect((await mountStatus()).status.value).toEqual({
      open: false,
      nextOpening: "11:30 Uhr",
    });
  });
});
