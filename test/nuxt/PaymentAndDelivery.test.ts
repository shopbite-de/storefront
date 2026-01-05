import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import PaymentAndDelivery from "~/components/Checkout/PaymentAndDelivery.vue";
import { ref } from "vue";

const { mockSetPaymentMethod, mockSetShippingMethod, mockRefreshCart } =
  vi.hoisted(() => ({
    mockSetPaymentMethod: vi.fn(),
    mockSetShippingMethod: vi.fn(),
    mockRefreshCart: vi.fn(),
  }));

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
  selectedShippingMethod: ref({ id: "sm1", name: "Shipping 1" }),
  setPaymentMethod: mockSetPaymentMethod,
  setShippingMethod: mockSetShippingMethod,
  getPaymentMethods: vi.fn(),
  getShippingMethods: vi.fn(),
}));

mockNuxtImport("useCart", () => () => ({
  refreshCart: mockRefreshCart,
}));

mockNuxtImport("useToast", () => () => ({
  add: vi.fn(),
}));

describe("PaymentAndDelivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);
    expect(wrapper.exists()).toBeTruthy();
    expect(wrapper.text()).toContain("Zahlungsarten");
    expect(wrapper.text()).toContain("Versandarten");
  });

  it("updates payment method when changed", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);

    // @ts-ignore - access internal state
    wrapper.vm.selectedPaymentMethodId = "pm2";
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSetPaymentMethod).toHaveBeenCalledWith({ id: "pm2" });
  });

  it("updates shipping method and refreshes cart when changed", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);

    // @ts-ignore - access internal state
    wrapper.vm.selectedShippingMethodId = "sm2";
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSetShippingMethod).toHaveBeenCalledWith({ id: "sm2" });
    expect(mockRefreshCart).toHaveBeenCalled();
  });

  it("renders help buttons with correct links", async () => {
    const wrapper = await mountSuspended(PaymentAndDelivery);
    const helpButtons = wrapper.findAll(
      'a[href="/unternehmen/zahlung-und-versand"]',
    );
    expect(helpButtons.length).toBe(2);
  });
});
