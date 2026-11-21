import { describe, it, expect } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed } from "vue";
import Kasse from "~/pages/bestellung/kasse.vue";

// A press in a second tab after the order: the cart is empty when the
// answer comes, the checkout shows the order instead of a failure.
mockNuxtImport("useCartData", () => () => ({
  isEmpty: computed(() => true),
  refresh: async () => {},
}));

describe("checkout page after an order of another tab", () => {
  it("shows the order already placed above the empty cart", async () => {
    const wrapper = await mountSuspended(Kasse);
    useState("checkout-order-message").value = {
      title: "Deine Bestellung ist bereits eingegangen.",
      description: "Du musst nicht erneut bestellen.",
      link: { to: "/bestellung/o-7", label: "Zur Bestellung" },
    };
    await flushPromises();
    expect(wrapper.text()).toContain(
      "Deine Bestellung ist bereits eingegangen.",
    );
    expect(wrapper.get('[role="alert"] a').attributes("href")).toBe(
      "/bestellung/o-7",
    );
    expect(wrapper.text()).toContain("Ihr Warenkorb ist noch leer.");
  });
});
