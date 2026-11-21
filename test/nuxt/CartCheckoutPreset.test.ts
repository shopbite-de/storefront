import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import CartItem from "~/components/Cart/Item.vue";
import PaymentAndDelivery from "~/components/Checkout/PaymentAndDelivery.vue";
import { eur } from "../support/dishes";
import { cartLine } from "../support/cart";

// Cart and checkout of a shop with a style preset (#443).
const mocks = vi.hoisted(() => ({
  setQuantity: vi.fn(),
  removeLine: vi.fn(),
  setShippingMethod: vi.fn(),
  setPaymentMethod: vi.fn(),
  refreshCart: vi.fn(),
  ensureAvailableCheckoutMethods: vi.fn(),
}));

const selection = ref({
  shippingMethodId: "delivery",
  paymentMethodId: "cash",
});

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
}));
mockNuxtImport("useCartMutations", () => () => ({
  setQuantity: mocks.setQuantity,
  removeLine: mocks.removeLine,
  addLine: vi.fn(),
  isMutating: ref(false),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number }) =>
    `${value.amountMinor / 100} €`,
}));
// the checkout's methods from the BFF (ADR 0001, step 5)
mockNuxtImport("useCheckoutMethods", () => () => ({
  selection,
  paymentMethods: ref([
    { id: "cash", name: "Bar", description: null },
    { id: "ec", name: "EC-Karte", description: null },
  ]),
  selectPaymentMethod: mocks.setPaymentMethod,
  selectShippingMethod: mocks.setShippingMethod,
  loadPaymentMethods: vi.fn(),
  refreshSelection: vi.fn(),
}));
// all active methods, also those whose rule needs an address
mockNuxtImport("useShippingMethodChoice", () => () => ({
  methods: ref([
    { id: "delivery", name: "Lieferung" },
    { id: "pickup", name: "Abholung" },
  ]),
  load: vi.fn(),
}));
mockNuxtImport("useCartData", () => () => ({
  refresh: mocks.refreshCart,
}));
mockNuxtImport("useCheckoutMethodGuard", () => () => ({
  ensureAvailableCheckoutMethods: mocks.ensureAvailableCheckoutMethods,
  ensureAvailableShippingMethod: vi.fn(),
  ensureAvailablePaymentMethod: vi.fn(),
  isShippingMethodBlocked: ref(false),
  isPaymentMethodBlocked: ref(false),
  isResolving: ref(false),
}));

const lineItem = cartLine({
  id: "li-1",
  name: "Pizza Mix",
  variant: [{ group: "Größe", option: "30 cm" }],
  extras: [{ id: "x1", name: "Artischocken", unitPrice: eur(100) }],
  removedIngredients: ["Pilze"],
  quantity: 1,
  totalPrice: eur(950),
});

describe("cart and checkout with a preset (#443)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selection.value = { shippingMethodId: "delivery", paymentMethodId: "cash" };
  });

  it("shows a cart line with options and a stepper that removes at 1", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { line: lineItem },
    });
    expect(wrapper.find("h3").text()).toBe("Pizza Mix +Artischocken -Pilze");
    expect(wrapper.text()).toContain("Größe: 30 cm");
    expect(wrapper.text()).toContain("9.5 €");

    const [remove, more] = wrapper.findAll('[role="group"] button');
    expect(remove!.attributes("aria-label")).toBe(
      "Pizza Mix +Artischocken -Pilze entfernen",
    );
    await more!.trigger("click");
    expect(mocks.setQuantity).toHaveBeenCalledWith("li-1", 2);

    await wrapper.setProps({ line: { ...lineItem, quantity: 1 } });
    await flushPromises();
  });

  it("removes the line from the stepper at the minimum", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { line: lineItem },
    });
    await wrapper.findAll('[role="group"] button')[0]!.trigger("click");
    expect(mocks.removeLine).toHaveBeenCalledWith("li-1");
  });

  it("offers shipping and payment as radio cards, shipping first", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);
    await flushPromises();

    const headings = wrapper.findAll("h2").map((h) => h.text());
    expect(headings).toEqual(["Lieferung oder Abholung", "Bezahlung"]);
    const groups = wrapper.findAll('[role="radiogroup"]');
    expect(groups).toHaveLength(2);
    expect(
      groups[0]!.findAll('[role="radio"]').map((radio) => radio.text()),
    ).toEqual(["Lieferung", "Abholung"]);

    await groups[0]!.findAll('[role="radio"]')[1]!.trigger("click");
    await flushPromises();
    expect(mocks.setShippingMethod).toHaveBeenCalledWith("pickup");
    expect(mocks.refreshCart).toHaveBeenCalled();
  });
});

describe("useOrderMode (#443)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selection.value = { shippingMethodId: "delivery", paymentMethodId: "cash" };
  });

  it("switches the shipping method, then checks payment and the cart", async () => {
    const { options, selectable, selectedId } = useOrderMode();
    expect(selectable.value).toBe(true);
    expect(options.value.map((option) => option.label)).toEqual([
      "Lieferung",
      "Abholung",
    ]);

    selectedId.value = "pickup";
    await flushPromises();
    expect(mocks.setShippingMethod).toHaveBeenCalledWith("pickup");
    expect(mocks.ensureAvailableCheckoutMethods).toHaveBeenCalled();
    expect(mocks.refreshCart).toHaveBeenCalled();
  });

  it("ignores the method that is already selected", async () => {
    const { selectedId } = useOrderMode();
    selectedId.value = "delivery";
    await flushPromises();
    expect(mocks.setShippingMethod).not.toHaveBeenCalled();
  });
});
