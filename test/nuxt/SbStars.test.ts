import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import SbStars from "~/components/Sb/Stars.vue";

function fills(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper.findAll("svg").map((svg) => {
    const filled = svg.findAll('path[fill="currentColor"]');
    if (filled.length === 0) return 0;
    return filled[0]!.attributes("clip-path") ? 0.5 : 1;
  });
}

describe("SbStars (#444)", () => {
  it("draws 4,5 as four full and one half star, hidden from AT", async () => {
    const wrapper = await mountSuspended(SbStars, { props: { value: 4.5 } });
    expect(fills(wrapper)).toEqual([1, 1, 1, 1, 0.5]);
    expect(wrapper.attributes("aria-hidden")).toBe("true");
  });

  it("rounds to whole and half stars", async () => {
    const wrapper = await mountSuspended(SbStars, { props: { value: 3.8 } });
    expect(fills(wrapper)).toEqual([1, 1, 1, 1, 0]);
  });
});
