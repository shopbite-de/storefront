import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, h, onMounted, ref } from "vue";
import Summary from "~/components/Checkout/Summary.vue";

// One-page checkout of a shop with a style preset (#443).
const { state, mocks } = vi.hoisted(() => ({
  state: { guest: true },
  mocks: {
    createOrder: vi.fn(),
  },
}));

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
  colorMode: "light",
}));
mockNuxtImport("useOpeningHoursData", () => () => ({
  isLoading: ref(false),
  hasFailed: ref(false),
}));
mockNuxtImport("useCheckout", () => () => ({
  createOrder: mocks.createOrder,
  selectedPaymentMethod: ref({ id: "pm1" }),
  selectedShippingMethod: ref({ id: "sm1" }),
}));
mockNuxtImport("useCart", () => () => ({
  refreshCart: vi.fn().mockResolvedValue(undefined),
}));
mockNuxtImport("useUser", () => () => ({
  isLoggedIn: ref(false),
  isGuestSession: ref(state.guest),
  refreshUser: vi.fn(),
}));
mockNuxtImport("useShopBiteConfig", () => () => ({
  isCheckoutEnabled: ref(true),
  refresh: vi.fn(),
}));
mockNuxtImport("useTrackEvent", () => () => ({ trackOrder: vi.fn() }));
mockNuxtImport("useCheckoutMethodGuard", () => () => ({
  isShippingMethodBlocked: ref(false),
  isPaymentMethodBlocked: ref(false),
  ensureAvailableCheckoutMethods: vi.fn().mockResolvedValue(true),
}));

vi.mock("@shopware/composables", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shopware/composables")>()),
  useOrderPayment: () => ({ handlePayment: vi.fn(), paymentUrl: ref(null) }),
}));

const ValidTime = defineComponent({
  emits: ["update:valid"],
  setup(_, { emit }) {
    onMounted(() => emit("update:valid", true));
    return () => h("div");
  },
});

async function mountOnePage() {
  const wrapper = await mountSuspended(Summary, {
    global: {
      stubs: {
        UserDetail: true,
        CheckoutLoginOrRegister: true,
        CheckoutPaymentAndDelivery: true,
        CheckoutDeliveryTimeSelect: ValidTime,
        CheckoutVoucherInput: true,
        QuickView: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("one-page checkout (#443)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guest = true;
  });

  it("shows the four numbered sections and the order", async () => {
    const wrapper = await mountOnePage();
    expect(
      wrapper.findAll("h2").map((h2) => h2.text().replace(/\s+/g, " ")),
    ).toEqual([
      "1 Lieferung oder Abholung",
      "2 Wann?",
      "3 Ihre Angaben",
      "4 Bezahlung",
      "Ihre Bestellung",
    ]);
    expect(wrapper.get("button").text()).toBe("Zahlungspflichtig bestellen");
  });

  it("asks for the customer data first", async () => {
    state.guest = false;
    const wrapper = await mountOnePage();
    const button = wrapper.get("button");
    expect(button.text()).toBe("Bitte zuerst Ihre Angaben speichern");
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("shows a failed order in the form", async () => {
    mocks.createOrder.mockRejectedValue(new Error("invalid cart"));
    const wrapper = await mountOnePage();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain("Bestellung fehlgeschlagen");
  });
});
