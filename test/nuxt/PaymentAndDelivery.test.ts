import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import PaymentAndDelivery from "~/components/Checkout/PaymentAndDelivery.vue";
import { ref } from "vue";

const {
  mockSetPaymentMethod,
  mockSetShippingMethod,
  mockRefreshCart,
  mockEnsureAvailableShippingMethod,
} = vi.hoisted(() => ({
  mockSetPaymentMethod: vi.fn(),
  mockSetShippingMethod: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockEnsureAvailableShippingMethod: vi.fn(),
}));

// Shared so tests can simulate the session's shipping method changing.
// Only read lazily inside the composable factory, after module init.
const selectedShippingMethod = ref({ id: "sm1", name: "Shipping 1" });

mockNuxtImport("useCheckout", () => () => ({
  paymentMethods: ref([
    { id: "pm1", distinguishableName: "Payment 1" },
    { id: "pm2", distinguishableName: "Payment 2" },
  ]),
  shippingMethods: ref([
    { id: "sm1", name: "Shipping 1" },
    { id: "sm2", name: "Shipping 2" },
  ]),
  selectedPaymentMethod: ref({ id: "pm1", distinguishableName: "Payment 1" }),
  selectedShippingMethod,
  setPaymentMethod: mockSetPaymentMethod,
  setShippingMethod: mockSetShippingMethod,
  getPaymentMethods: vi.fn(),
  getShippingMethods: vi.fn(),
}));

mockNuxtImport("useCart", () => () => ({
  refreshCart: mockRefreshCart,
}));

mockNuxtImport("useShippingMethodGuard", () => () => ({
  ensureAvailableShippingMethod: mockEnsureAvailableShippingMethod,
  isShippingMethodBlocked: ref(false),
  isResolving: ref(false),
}));

mockNuxtImport("useToast", () => () => ({
  add: vi.fn(),
}));

describe("PaymentAndDelivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedShippingMethod.value = { id: "sm1", name: "Shipping 1" };
  });

  it("resolves a blocked shipping method after loading the methods", async () => {
    await mountSuspended(PaymentAndDelivery);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockEnsureAvailableShippingMethod).toHaveBeenCalledTimes(1);
  });

  it("syncs the radio when the session shipping method changes without re-setting it", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);

    selectedShippingMethod.value = { id: "sm2", name: "Shipping 2" };
    await new Promise((resolve) => setTimeout(resolve, 50));

    // @ts-expect-error - access internal state
    expect(wrapper.vm.selectedShippingMethodId).toBe("sm2");
    expect(mockSetShippingMethod).not.toHaveBeenCalled();
  });

  it("renders correctly", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);
    expect(wrapper.exists()).toBeTruthy();
    expect(wrapper.text()).toContain("Zahlungsarten");
    expect(wrapper.text()).toContain("Versandarten");
  });

  it("updates payment method when changed", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);

    // @ts-expect-error - access internal state
    wrapper.vm.selectedPaymentMethodId = "pm2";
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSetPaymentMethod).toHaveBeenCalledWith({ id: "pm2" });
  });

  it("updates shipping method and refreshes cart when changed", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);

    // @ts-expect-error - access internal state
    wrapper.vm.selectedShippingMethodId = "sm2";
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSetShippingMethod).toHaveBeenCalledWith({ id: "sm2" });
    expect(mockRefreshCart).toHaveBeenCalled();
  });

  it("renders help buttons with correct links", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);
    const helpButtons = wrapper.findAll('a[href="/zahlung-und-versand"]');
    expect(helpButtons.length).toBe(2);
  });
});
