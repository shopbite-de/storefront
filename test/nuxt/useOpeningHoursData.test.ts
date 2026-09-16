import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h, nextTick, ref, type Ref } from "vue";

// Refs are created per test in beforeEach; the mocks read them lazily.
const { state } = vi.hoisted(() => ({
  state: {
    refreshBusinessHours: vi.fn(),
    refreshHolidays: vi.fn(),
  } as {
    businessHours: Ref<unknown>;
    businessHoursStatus: Ref<string>;
    holidays: Ref<unknown>;
    holidaysStatus: Ref<string>;
    refreshBusinessHours: ReturnType<typeof vi.fn>;
    refreshHolidays: ReturnType<typeof vi.fn>;
  },
}));

mockNuxtImport("useBusinessHours", () => () => ({
  businessHours: state.businessHours,
  status: state.businessHoursStatus,
  refresh: state.refreshBusinessHours,
}));

mockNuxtImport("useHolidays", () => () => ({
  holidays: state.holidays,
  status: state.holidaysStatus,
  refresh: state.refreshHolidays,
}));

/** Also returns `hasFailed` as the first render (server, hydration) saw it. */
async function mountComposable() {
  let result!: ReturnType<typeof useOpeningHoursData>;
  let hasFailedOnRender!: boolean;
  await mountSuspended(
    defineComponent({
      setup() {
        result = useOpeningHoursData();
        hasFailedOnRender = result.hasFailed.value;
        return () => h("div");
      },
    }),
  );
  return { ...result, hasFailedOnRender };
}

describe("useOpeningHoursData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.businessHours = ref(null);
    state.businessHoursStatus = ref("idle");
    state.holidays = ref(null);
    state.holidaysStatus = ref("idle");
  });

  it("is loading until business hours and holidays are there", async () => {
    state.businessHours.value = [];
    state.businessHoursStatus.value = "success";
    state.holidaysStatus.value = "pending";

    const { isLoaded, isLoading, hasFailed } = await mountComposable();

    expect(isLoaded.value).toBe(false);
    expect(isLoading.value).toBe(true);
    expect(hasFailed.value).toBe(false);

    state.holidays.value = [];
    state.holidaysStatus.value = "success";
    await nextTick();

    expect(isLoaded.value).toBe(true);
    expect(isLoading.value).toBe(false);
  });

  it("has failed when a request failed and none is running", async () => {
    state.businessHoursStatus.value = "error";
    state.holidaysStatus.value = "pending";

    const { isLoading, hasFailed } = await mountComposable();

    expect(hasFailed.value).toBe(false);

    state.holidays.value = [];
    state.holidaysStatus.value = "success";
    await nextTick();

    expect(hasFailed.value).toBe(true);
    expect(isLoading.value).toBe(false);
  });

  it("does not report a failure before mounting (hydration)", async () => {
    state.businessHoursStatus.value = "error";
    state.holidaysStatus.value = "error";

    const { hasFailed, hasFailedOnRender } = await mountComposable();

    expect(hasFailedOnRender).toBe(false);
    expect(hasFailed.value).toBe(true);
  });

  it("loads again when retrying", async () => {
    state.businessHours.value = [];
    state.businessHoursStatus.value = "success";
    state.holidaysStatus.value = "error";

    const { hasFailed, isLoading, retry } = await mountComposable();
    expect(hasFailed.value).toBe(true);

    state.refreshHolidays.mockImplementation(async () => {
      state.holidaysStatus.value = "pending";
    });
    await retry();

    expect(state.refreshHolidays).toHaveBeenCalledTimes(1);
    expect(state.refreshBusinessHours).not.toHaveBeenCalled();
    expect(hasFailed.value).toBe(false);
    expect(isLoading.value).toBe(true);
  });
});
