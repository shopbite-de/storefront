import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import FooterStoreStatus from "~/components/Footer/StoreStatus.vue";
import type { StoreStatus } from "~/composables/useStoreStatus";

const { state } = vi.hoisted(() => ({
  state: { status: null as StoreStatus | null },
}));

mockNuxtImport("useStoreStatus", () => () => ({
  status: ref(state.status),
}));

describe("FooterStoreStatus", () => {
  beforeEach(() => {
    state.status = null;
  });

  it("shows the closing time while open", async () => {
    state.status = { open: true, closesAt: "23:00" };

    const wrapper = await mountSuspended(FooterStoreStatus);
    const status = wrapper.find('[role="status"]');

    expect(status.text()).toBe("Geöffnet bis 23:00 Uhr");
    expect(status.find(".bg-success").exists()).toBe(true);
  });

  it("shows the next opening while closed", async () => {
    state.status = { open: false, nextOpening: "morgen um 11:30 Uhr" };

    const wrapper = await mountSuspended(FooterStoreStatus);
    const status = wrapper.find('[role="status"]');

    expect(status.text()).toBe(
      "Geschlossen, wir öffnen wieder morgen um 11:30 Uhr",
    );
    expect(status.find(".bg-success").exists()).toBe(false);
  });

  it("renders a placeholder while the status is unknown", async () => {
    const wrapper = await mountSuspended(FooterStoreStatus);

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.text()).toBe("");
  });
});
