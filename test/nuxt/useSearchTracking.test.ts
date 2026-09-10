import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { nextTick, ref } from "vue";
import type { Schemas } from "#shopware";
import { useSearchTracking } from "../../app/composables/useSearchTracking";

const { mockTrackSearch } = vi.hoisted(() => ({ mockTrackSearch: vi.fn() }));

mockNuxtImport("useTrackEvent", () => () => ({
  trackSearch: mockTrackSearch,
}));

const products = (...numbers: string[]) =>
  numbers.map((productNumber) => ({ productNumber }) as Schemas["Product"]);

describe("useSearchTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks results that are already present on setup (direct page load)", () => {
    useSearchTracking(ref("pizza"), ref(products("21", "22")), ref(false));

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);
    expect(mockTrackSearch).toHaveBeenCalledWith("pizza", ["21", "22"]);
  });

  it("waits for the skeleton to disappear (client-side navigation)", async () => {
    const elements = ref(products());
    const showSkeleton = ref(true);
    useSearchTracking(ref("pizza"), elements, showSkeleton);

    expect(mockTrackSearch).not.toHaveBeenCalled();

    elements.value = products("21");
    showSkeleton.value = false;
    await nextTick();

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);
    expect(mockTrackSearch).toHaveBeenCalledWith("pizza", ["21"]);
  });

  it("tracks a new term once and ignores re-fetches of the same term", async () => {
    const query = ref("pizza");
    const elements = ref(products("21"));
    useSearchTracking(query, elements, ref(false));
    expect(mockTrackSearch).toHaveBeenCalledTimes(1);

    // sorting change: same term, new results
    elements.value = products("22", "21");
    await nextTick();
    expect(mockTrackSearch).toHaveBeenCalledTimes(1);

    // new search
    query.value = "salat";
    elements.value = products("12");
    await nextTick();
    expect(mockTrackSearch).toHaveBeenCalledTimes(2);
    expect(mockTrackSearch).toHaveBeenLastCalledWith("salat", ["12"]);
  });

  it("does not track without a search term", async () => {
    const elements = ref(products());
    useSearchTracking(ref(""), elements, ref(false));

    elements.value = products("21");
    await nextTick();

    expect(mockTrackSearch).not.toHaveBeenCalled();
  });
});
