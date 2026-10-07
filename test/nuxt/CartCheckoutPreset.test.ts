import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import CartItem from "~/components/Cart/Item.vue";
import PaymentAndDelivery from "~/components/Checkout/PaymentAndDelivery.vue";
import type { Schemas } from "#shopware";

// Cart and checkout of a shop with a style preset (#443).
const mocks = vi.hoisted(() => ({
  setQuantity: vi.fn(),
  removeLineItem: vi.fn(),
  setShippingMethod: vi.fn(),
  setPaymentMethod: vi.fn(),
  refreshCart: vi.fn(),
  ensureAvailableCheckoutMethods: vi.fn(),
}));

const selectedShippingMethod = ref<{ id: string; name: string } | null>({
  id: "delivery",
  name: "Lieferung",
});
const selectedPaymentMethod = ref({ id: "cash", distinguishableName: "Bar" });

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  hasPreset: true,
  menuView: "bon",
}));
mockNuxtImport("useCartMutations", () => () => ({
  setQuantity: mocks.setQuantity,
  removeLineItem: mocks.removeLineItem,
  addLineItems: vi.fn(),
  isMutating: ref(false),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (value: number) => `${value} €`,
}));
mockNuxtImport("useCheckout", () => () => ({
  paymentMethods: ref([
    { id: "cash", distinguishableName: "Bar" },
    { id: "ec", distinguishableName: "EC-Karte" },
  ]),
  shippingMethods: ref([
    { id: "delivery", name: "Lieferung" },
    { id: "pickup", name: "Abholung" },
  ]),
  selectedPaymentMethod,
  selectedShippingMethod,
  setPaymentMethod: mocks.setPaymentMethod,
  setShippingMethod: mocks.setShippingMethod,
  getPaymentMethods: vi.fn(),
  getShippingMethods: vi.fn(),
}));
mockNuxtImport("useCart", () => () => ({
  refreshCart: mocks.refreshCart,
}));
mockNuxtImport("useCheckoutMethodGuard", () => () => ({
  ensureAvailableCheckoutMethods: mocks.ensureAvailableCheckoutMethods,
  ensureAvailableShippingMethod: vi.fn(),
  ensureAvailablePaymentMethod: vi.fn(),
  isShippingMethodBlocked: ref(false),
  isPaymentMethodBlocked: ref(false),
  isResolving: ref(false),
}));
mockNuxtImport("useToast", () => () => ({ add: vi.fn() }));

const lineItem = {
  id: "li-1",
  label: "Pizza Mix +Artischocken -Pilze",
  quantity: 1,
  type: "container",
  price: { totalPrice: 9.5 },
  children: [{ payload: { options: [{ group: "Größe", option: "30 cm" }] } }],
} as unknown as Schemas["LineItem"];

describe("cart and checkout with a preset (#443)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedShippingMethod.value = { id: "delivery", name: "Lieferung" };
  });

  it("shows a cart line with options and a stepper that removes at 1", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { cartItem: lineItem },
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

    await wrapper.setProps({ cartItem: { ...lineItem, quantity: 1 } });
    await flushPromises();
  });

  it("removes the line from the stepper at the minimum", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { cartItem: lineItem },
    });
    await wrapper.findAll('[role="group"] button')[0]!.trigger("click");
    expect(mocks.removeLineItem).toHaveBeenCalledWith(lineItem);
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
    expect(mocks.setShippingMethod).toHaveBeenCalledWith({ id: "pickup" });
    expect(mocks.refreshCart).toHaveBeenCalled();
  });
});

describe("useOrderMode (#443)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedShippingMethod.value = { id: "delivery", name: "Lieferung" };
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
    expect(mocks.setShippingMethod).toHaveBeenCalledWith({ id: "pickup" });
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
