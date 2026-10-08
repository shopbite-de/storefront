import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import ConfirmationPreset from "~/components/Order/ConfirmationPreset.vue";
import DetailPreset from "~/components/Order/DetailPreset.vue";
import type { Schemas } from "#shopware";

// Order confirmation and order page of the presets (#445).
const mocks = vi.hoisted(() => ({
  loadOrderDetails: vi.fn(),
}));
const order = ref<Schemas["Order"] | undefined>(undefined);

vi.mock("@shopware/composables", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shopware/composables")>()),
  useOrderDetails: () => ({
    order,
    status: ref("Offen"),
    loadOrderDetails: mocks.loadOrderDetails,
  }),
}));
mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  hasPreset: true,
  menuView: "bon",
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (value: number) => `${value} €`,
}));

const sampleOrder = {
  id: "order-1",
  orderNumber: "10042",
  createdAt: "2026-10-08T17:30:00.000Z",
  taxStatus: "gross",
  customerComment: "Wunschlieferzeit: 19:15",
  shippingTotal: 1,
  amountTotal: 21.5,
  price: { calculatedTaxes: [{ taxRate: 7, tax: 1.41 }] },
  deliveries: [{ shippingMethod: { name: "Lieferung" } }],
  transactions: [
    {
      paymentMethod: { distinguishableName: "Bar" },
      stateMachineState: { name: "Offen" },
    },
  ],
  lineItems: [
    {
      id: "li-1",
      parentId: null,
      quantity: 2,
      label: "Pizza Margherita",
      totalPrice: 17,
      payload: { productNumber: "LF-4" },
    },
    { id: "li-2", parentId: "li-1", quantity: 1, label: "Extra Käse" },
  ],
} as unknown as Schemas["Order"];

describe("order pages with a preset (#445)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.value = undefined;
    Object.assign(useRuntimeConfig().public.site, {
      telephone: "06104 71427",
    });
  });

  it("thanks the guest and shows the order after loading", async () => {
    mocks.loadOrderDetails.mockImplementation(async () => {
      order.value = sampleOrder;
    });
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1", kind: "success" },
    });
    expect(wrapper.find("h1").text()).toBe("Vielen Dank für Ihre Bestellung");
    await flushPromises();

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
    // only top-level lines, the extra belongs to its container
    const lines = wrapper.findAll("li").map((li) => li.text());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("2× Pizza Margherita");
    expect(wrapper.text()).toContain("enthaltene MwSt. 7 %");

    const call = wrapper.find('a[href^="tel:"]');
    expect(call.text()).toContain("Anrufen:");
    expect(call.text()).toContain("06104 71427");
  });

  it("titles the order page with the order number", async () => {
    mocks.loadOrderDetails.mockImplementation(async () => {
      order.value = sampleOrder;
    });
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1" },
    });
    await flushPromises();
    expect(wrapper.find("h1").text()).toBe("10042");
  });

  it("says when the order cannot be loaded", async () => {
    mocks.loadOrderDetails.mockRejectedValue(new Error("403"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountSuspended(ConfirmationPreset, {
      props: { orderId: "order-1", kind: "success" },
    });
    await flushPromises();
    const alert = wrapper.find('[role="alert"]');
    expect(alert.text()).toContain("Die Bestellung konnte nicht geladen werden");
    expect(alert.text()).toContain("trotzdem bei uns eingegangen");
  });

  it("lists the tax on top for net orders", async () => {
    const wrapper = await mountSuspended(DetailPreset, {
      props: { order: { ...sampleOrder, taxStatus: "net" } },
    });
    expect(wrapper.text()).toContain("zzgl. MwSt. 7 %");
  });
});
