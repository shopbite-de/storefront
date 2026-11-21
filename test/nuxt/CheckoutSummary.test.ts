import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h, onMounted, ref } from "vue";
import Summary from "~/components/Checkout/Summary.vue";

const { state, mocks } = vi.hoisted(() => ({
  mocks: {
    createOrder: vi.fn(),
    checkAcceptsOrders: vi.fn(),
  },
  state: {
    isLoading: true,
    hasFailed: false,
    validTime: false,
    shippingBlocked: false,
    customer: true,
    fulfillment: "delivery" as "delivery" | "pickup",
  },
}));

mockNuxtImport("useShippingLeadTime", () => () => ({
  fulfillment: ref(state.fulfillment),
  leadTime: ref(30),
}));

mockNuxtImport("useOpeningHoursData", () => () => ({
  isLoading: ref(state.isLoading),
  hasFailed: ref(state.hasFailed),
}));

mockNuxtImport("useCheckout", () => () => ({
  createOrder: mocks.createOrder,
  selectedPaymentMethod: ref({ id: "pm1" }),
  selectedShippingMethod: ref({ id: "sm1", name: "Lieferung" }),
}));

mockNuxtImport("useCartData", () => () => ({
  refresh: vi.fn().mockResolvedValue(undefined),
}));

mockNuxtImport("useUser", () => () => ({
  isLoggedIn: ref(false),
  isGuestSession: ref(state.customer),
  refreshUser: vi.fn(),
}));

mockNuxtImport("useShopConfig", () => () => ({
  acceptsOrders: ref(true),
  refresh: vi.fn(),
  checkAcceptsOrders: mocks.checkAcceptsOrders,
}));

// A successful order navigates to the confirmation page; loading that
// route after the test environment is torn down is an unhandled error.
mockNuxtImport("navigateTo", () => vi.fn());

mockNuxtImport("useTrackEvent", () => () => ({
  trackOrder: vi.fn(),
}));

mockNuxtImport("useCheckoutMethodGuard", () => () => ({
  isShippingMethodBlocked: ref(state.shippingBlocked),
  isPaymentMethodBlocked: ref(false),
  ensureAvailableCheckoutMethods: vi.fn().mockResolvedValue(true),
}));

vi.mock("@shopware/composables", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shopware/composables")>()),
  useOrderPayment: () => ({ handlePayment: vi.fn(), paymentUrl: ref(null) }),
}));

// Reports the time as DeliveryTimeSelect does once a time is selected.
const DeliveryTimeSelectStub = defineComponent({
  emits: ["update:valid", "update:modelValue"],
  setup(_, { emit }) {
    onMounted(() => {
      emit("update:modelValue", "19:15");
      emit("update:valid", state.validTime);
    });
    return () => h("div");
  },
});

async function mountSummary() {
  const wrapper = await mountSuspended(Summary, {
    global: {
      stubs: {
        UserDetail: true,
        CheckoutLoginOrRegister: true,
        CheckoutPaymentAndDelivery: true,
        CheckoutDeliveryTimeSelect: DeliveryTimeSelectStub,
        CheckoutVoucherInput: true,
        QuickView: true,
      },
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  // The order button is the only button besides the stubbed children.
  return wrapper.get("button");
}

describe("Checkout Summary order button", () => {
  beforeEach(() => {
    state.isLoading = true;
    state.hasFailed = false;
    state.validTime = false;
    state.shippingBlocked = false;
    state.customer = true;
    state.fulfillment = "delivery";
    mocks.createOrder.mockReset();
    mocks.checkAcceptsOrders.mockReset();
  });

  it("shows a loading state while the opening hours are not loaded", async () => {
    const button = await mountSummary();

    expect(button.text()).toBe("Lade Öffnungszeiten …");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBe("true");
  });

  it("says the opening hours could not be loaded when loading failed", async () => {
    state.isLoading = false;
    state.hasFailed = true;

    const button = await mountSummary();

    expect(button.text()).toBe("Öffnungszeiten konnten nicht geladen werden");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBeUndefined();
  });

  it("says the shop is closed once loaded without a valid time", async () => {
    state.isLoading = false;

    const button = await mountSummary();

    expect(button.text()).toBe("Wir haben aktuell leider geschlossen");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBeUndefined();
  });

  it("allows ordering once loaded with a valid time", async () => {
    state.isLoading = false;
    state.validTime = true;

    const button = await mountSummary();

    expect(button.text()).toBe("Zahlungspflichtig bestellen");
    expect(button.attributes("disabled")).toBeUndefined();
  });

  // e.g. "Lieferung" needs a shipping city in the delivery area
  it("says delivery is not possible once the address is known", async () => {
    state.isLoading = false;
    state.validTime = true;
    state.shippingBlocked = true;

    const button = await mountSummary();
    const page = button.element.closest(".grid")!;

    expect(button.text()).toBe("Lieferung ist hier nicht möglich");
    expect(button.attributes("disabled")).toBeDefined();
    expect(page.textContent).toContain(
      "Lieferung ist für Ihre Adresse oder Ihren Warenkorb leider nicht möglich",
    );
  });

  it("only hints at the address check before the guest entered one", async () => {
    state.isLoading = false;
    state.validTime = true;
    state.shippingBlocked = true;
    state.customer = false;

    const button = await mountSummary();
    const page = button.element.closest(".grid")!;

    expect(button.text()).toBe("Bitte zuerst Ihre Angaben speichern");
    expect(page.textContent).toContain(
      "Ob Lieferung an Ihre Adresse möglich ist",
    );
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it("does not order when Shopware says the checkout was switched off", async () => {
    state.isLoading = false;
    state.validTime = true;
    mocks.checkAcceptsOrders.mockResolvedValue(false);

    const button = await mountSummary();
    await button.trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.checkAcceptsOrders).toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(button.element.closest(".grid")!.textContent).toContain(
      "Es werden aktuell keine weiteren Bestellungen mehr aufgenommen",
    );
  });

  it("does not order when the checkout switch cannot be checked", async () => {
    state.isLoading = false;
    state.validTime = true;
    mocks.checkAcceptsOrders.mockResolvedValue(null);

    const button = await mountSummary();
    await button.trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(button.element.closest(".grid")!.textContent).toContain(
      "konnte nicht geprüft werden",
    );
  });

  // shopbite#6: the comment names the kind of time
  it.each([
    ["delivery", "Wunschlieferzeit: 19:15"],
    ["pickup", "Wunschabholzeit: 19:15"],
  ] as const)(
    "stores the wished time of a %s order",
    async (fulfillment, comment) => {
      state.isLoading = false;
      state.validTime = true;
      state.fulfillment = fulfillment;
      mocks.checkAcceptsOrders.mockResolvedValue(true);
      mocks.createOrder.mockResolvedValue({ id: "order-1" });

      const button = await mountSummary();
      await button.trigger("click");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mocks.createOrder).toHaveBeenCalledWith({
        customerComment: comment,
      });
    },
  );
});
