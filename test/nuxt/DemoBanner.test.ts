import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import DemoBanner from "~/components/DemoBanner.vue";

describe("DemoBanner", () => {
  it("renders the demo notice", async () => {
    const wrapper = await mountSuspended(DemoBanner);

    expect(wrapper.text()).toContain("Demo-Shop");
    expect(wrapper.text()).toContain("nicht ausgeliefert");
  });
});
