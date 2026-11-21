import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import ConfirmationPreset from "~/components/Order/Confirmation.vue";
import DetailPreset from "~/components/Order/Detail.vue";
import type { Order } from "../../shared/domain";
import { eur } from "../support/dishes";

// Order confirmation and order page of the presets (#445), on the domain
// order of the BFF (ADR 0001, step 5).
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

const loaded = ref<Order | null>(null);
mockNuxtImport("useOrder", () => (orderId: string) => ({
  order: loaded,
  load: async () => {
    loaded.value = await mocks.fetch(`/api/orders/${orderId}`);
    return loaded.value;
  },
}));
mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number }) =>
    `${value.amountMinor / 100} €`,
}));

const address = {
  id: "a-1",
  salutation: null,
  firstName: "Max",
  lastName: "Muster",
  company: null,
  department: null,
  street: "Musterstraße 1",
  additionalLine: null,
  postalCode: "12345",
  city: "Musterstadt",
  country: "DE",
  phone: "0123456789",
};

const sampleOrder: Order = {
  id: "order-1",
  number: "10042",
  placedAt: "2026-10-08T17:30:00.000Z",
  status: "open",
  paymentStatus: "open",
  fulfillment: "delivery",
  wishedTime: { date: "2026-10-08", time: { minutes: 19 * 60 + 15 } },
  shippingMethod: { id: "sm-1", name: "Lieferung" },
  paymentMethod: { id: "pm-1", name: "Bar" },
  lines: [
    {
      id: "li-1",
      configuration: {
        dishId: "d-1",
        variantId: null,
        extraIds: ["x-1"],
        removedIngredientIds: [],
      },
      dishNumber: "LF-4",
      name: "Pizza Margherita",
      extras: [{ name: "Extra Käse", unitPrice: eur(150) }],
      removedIngredients: ["Zwiebeln"],
      quantity: 2,
      unitPrice: eur(1000),
      totalPrice: eur(2000),
    },
  ],
  discounts: [
    { code: "WILLKOMMEN", name: "Willkommensrabatt", amount: eur(-200) },
  ],
  subtotal: eur(1800),
  shippingCosts: eur(100),
  total: eur(1900),
  taxes: [{ rate: 7, amount: eur(124) }],
  taxIncluded: true,
  billingAddress: address,
  deliveryAddress: address,
  email: "max@example.com",
  note: null,
};

describe("order pages with a preset (#445)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loaded.value = null;
    Object.assign(useRuntimeConfig().public.site, {
      telephone: "0123 456789",
    });
  });

  // shopbite#6: pickup orders have a wished pickup time
  it("shows the wished pickup time", async () => {
    mocks.fetch.mockResolvedValue({
      ...sampleOrder,
      fulfillment: "pickup",
      wishedTime: { date: "2026-10-08", time: { minutes: 18 * 60 + 40 } },
    });
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1", kind: "success" },
    });
    await flushPromises();

    const facts = wrapper
      .findAll("dl")[0]!
      .findAll("div")
      .map((row) => row.text());
    expect(facts).toContain("Wunschzeit18:40");
  });

  it("thanks the guest and shows the order after loading", async () => {
    mocks.fetch.mockResolvedValue(sampleOrder);
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1", kind: "success" },
    });
    expect(wrapper.find("h1").text()).toBe("Vielen Dank für Ihre Bestellung");
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith("/api/orders/order-1");
    expect(wrapper.text()).toContain("Ihre Bestellnummer ist 10042");
    const facts = wrapper
      .findAll("dl")[0]!
      .findAll("div")
      .map((row) => row.text());
    expect(facts).toEqual([
      "StatusOffen",
      "Lieferung oder AbholungLieferung",
      "Wunschzeit19:15",
      "BezahlungBar, Offen",
    ]);
    // one receipt line per dish configuration, then the discount
    const lines = wrapper.findAll("li").map((li) => li.text());
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("2× Pizza Margherita +Extra Käse -Zwiebeln");
    expect(lines[0]).toContain("Nr. LF-4");
    expect(lines[1]).toContain("Willkommensrabatt");
    expect(lines[1]).toContain("-2 €");
    expect(wrapper.text()).toContain("enthaltene MwSt. 7 %");

    const call = wrapper.find('a[href^="tel:"]');
    expect(call.text()).toContain("Anrufen:");
    expect(call.text()).toContain("0123 456789");
  });

  it("titles the order page with the order number", async () => {
    mocks.fetch.mockResolvedValue(sampleOrder);
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1" },
    });
    await flushPromises();
    expect(wrapper.find("h1").text()).toBe("10042");
  });

  it("says when the order cannot be loaded", async () => {
    mocks.fetch.mockRejectedValue(
      Object.assign(new Error("404"), { statusCode: 404 }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1", kind: "success" },
    });
    await flushPromises();
    const alert = wrapper.find('[role="alert"]');
    expect(alert.text()).toContain(
      "Die Bestellung konnte nicht geladen werden",
    );
    expect(alert.text()).toContain("trotzdem bei uns eingegangen");
  });

  it("lists the tax on top for net orders", async () => {
    const wrapper = await mountSuspended(DetailPreset, {
      props: { order: { ...sampleOrder, taxIncluded: false } },
    });
    expect(wrapper.text()).toContain("zzgl. MwSt. 7 %");
  });
});
