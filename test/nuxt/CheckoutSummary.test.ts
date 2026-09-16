import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h, onMounted, ref } from "vue";
import Summary from "~/components/Checkout/Summary.vue";

const { state } = vi.hoisted(() => ({
  state: {
    isLoading: true,
    hasFailed: false,
    validTime: false,
  },
}));

mockNuxtImport("useOpeningHoursData", () => () => ({
  isLoading: ref(state.isLoading),
  hasFailed: ref(state.hasFailed),
}));

mockNuxtImport("useCheckout", () => () => ({
  createOrder: vi.fn(),
  selectedPaymentMethod: ref({ id: "pm1" }),
  selectedShippingMethod: ref({ id: "sm1" }),
}));

mockNuxtImport("useCart", () => () => ({
  refreshCart: vi.fn(),
}));

mockNuxtImport("useUser", () => () => ({
  isLoggedIn: ref(false),
  isGuestSession: ref(true),
  refreshUser: vi.fn(),
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  isCheckoutEnabled: ref(true),
  refresh: vi.fn(),
}));

mockNuxtImport("useTrackEvent", () => () => ({
  trackOrder: vi.fn(),
}));

mockNuxtImport("useCheckoutMethodGuard", () => () => ({
  isShippingMethodBlocked: ref(false),
  isPaymentMethodBlocked: ref(false),
  ensureAvailableCheckoutMethods: vi.fn().mockResolvedValue(true),
}));

vi.mock("@shopware/composables", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shopware/composables")>()),
  useOrderPayment: () => ({ handlePayment: vi.fn(), paymentUrl: ref(null) }),
}));

// Reports the time as DeliveryTimeSelect does once a time is selected.
const DeliveryTimeSelectStub = defineComponent({
  emits: ["update:valid"],
  setup(_, { emit }) {
    onMounted(() => emit("update:valid", state.validTime));
    return () => h("div");
  },
});

async function mountSummary() {
  const wrapper = await mountSuspended(Summary, {
    global: {
      stubs: {
        UserDetail: true,
        CheckoutPaymentMethod: true,
        CheckoutShippingMethod: true,
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
  });

  it("shows a loading state while the opening hours are not loaded", async () => {
    const button = await mountSummary();

    expect(button.text()).toBe("Lade Öffnungszeiten …");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.find(".animate-spin").exists()).toBe(true);
  });

  it("says the opening hours could not be loaded when loading failed", async () => {
    state.isLoading = false;
    state.hasFailed = true;

    const button = await mountSummary();

    expect(button.text()).toBe("Öffnungszeiten konnten nicht geladen werden");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.find(".animate-spin").exists()).toBe(false);
  });

  it("says the shop is closed once loaded without a valid time", async () => {
    state.isLoading = false;

    const button = await mountSummary();

    expect(button.text()).toBe("Wir haben aktuell leider geschlossen");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.find(".animate-spin").exists()).toBe(false);
  });

  it("allows ordering once loaded with a valid time", async () => {
    state.isLoading = false;
    state.validTime = true;

    const button = await mountSummary();

    expect(button.text()).toBe("Jetzt bestellen!");
    expect(button.attributes("disabled")).toBeUndefined();
  });
});
