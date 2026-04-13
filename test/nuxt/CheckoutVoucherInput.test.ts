import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import CheckoutVoucherInput from "~/components/Checkout/VoucherInput.vue";

const { mockAddPromotionCode, mockRemoveItem } = vi.hoisted(() => ({
  mockAddPromotionCode: vi.fn().mockResolvedValue(undefined),
  mockRemoveItem: vi.fn(),
}));

const mockCart = ref<{ errors?: Record<string, unknown> } | null>(null);
const mockAppliedPromotionCodes = ref<{ id: string; label: string }[]>([]);

mockNuxtImport("useCommerceCart", () => () => ({
  cart: mockCart,
  addPromotionCode: mockAddPromotionCode,
  appliedPromotionCodes: mockAppliedPromotionCodes,
  removeItem: mockRemoveItem,
}));

const mockToastAdd = vi.fn();
mockNuxtImport("useToast", () => () => ({
  add: mockToastAdd,
}));

describe("CheckoutVoucherInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddPromotionCode.mockResolvedValue(undefined);
    mockAppliedPromotionCodes.value = [];
    mockCart.value = null;
  });

  it("renders the input and button", async () => {
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    expect(wrapper.find("input").exists()).toBe(true);
    expect(wrapper.text()).toContain("Einlösen");
  });

  it("apply button is disabled when input is empty", async () => {
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("apply button is enabled when input has a value", async () => {
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await nextTick();
    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeUndefined();
  });

  it("does not call addPromotionCode a second time if already loading", async () => {
    let resolvePromotion!: () => void;
    mockAddPromotionCode.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolvePromotion = resolve;
      }),
    );

    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await nextTick();

    // First invocation — in-flight
    wrapper.find("button").trigger("click");
    await nextTick();

    // Second invocation while still loading
    wrapper.find("button").trigger("click");
    await nextTick();
    await wrapper.find("input").trigger("keyup.enter");
    await nextTick();

    resolvePromotion();
    mockCart.value = { errors: {} };
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockAddPromotionCode).toHaveBeenCalledTimes(1);
  });

  it("disables the button and input while loading to prevent concurrent submits", async () => {
    let resolvePromotion!: () => void;
    mockAddPromotionCode.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolvePromotion = resolve;
      }),
    );

    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await nextTick();

    wrapper.find("button").trigger("click");
    await nextTick();

    // While the request is in-flight both button and input must be disabled
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    expect(wrapper.find("input").attributes("disabled")).toBeDefined();

    // Resolve and confirm the loading guard is lifted
    resolvePromotion();
    mockCart.value = { errors: {} };
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Input is no longer disabled by loading (code was cleared on success, button
    // disabled due to empty input is expected and correct)
    expect(wrapper.find("input").attributes("disabled")).toBeUndefined();
  });

  it("clears the input and does not show a toast on successful voucher apply", async () => {
    mockCart.value = { errors: {} };
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await wrapper.find("button").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockAddPromotionCode).toHaveBeenCalledWith("SAVE10");
    expect(mockToastAdd).not.toHaveBeenCalled();
    expect(wrapper.find("input").element.value).toBe("");
  });

  it("shows the translated error from cart.errors when the code is invalid", async () => {
    mockCart.value = {
      errors: {
        "promotion-not-found": {
          promotionCode: "INVALID",
          translatedMessage: 'Gutscheincode "INVALID" existiert nicht.',
        },
      },
    };
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("INVALID");
    await wrapper.find("button").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Gutschein ungültig",
        description: 'Gutscheincode "INVALID" existiert nicht.',
        color: "error",
      }),
    );
    expect(wrapper.find("input").element.value).toBe("INVALID");
  });

  it("shows a generic error toast when addPromotionCode throws", async () => {
    mockAddPromotionCode.mockRejectedValueOnce(new Error("network error"));
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await wrapper.find("button").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Gutschein ungültig",
        color: "error",
      }),
    );
  });

  it("submits on Enter key", async () => {
    mockCart.value = { errors: {} };
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("ENTER10");
    await wrapper.find("input").trigger("keyup.enter");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockAddPromotionCode).toHaveBeenCalledWith("ENTER10");
  });

  it("renders applied promotion codes", async () => {
    mockAppliedPromotionCodes.value = [
      { id: "promo-1", label: "10% Rabatt" },
      { id: "promo-2", label: "Gratis Versand" },
    ];
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    expect(wrapper.text()).toContain("10% Rabatt");
    expect(wrapper.text()).toContain("Gratis Versand");
  });

  it("calls removeItem when remove button is clicked", async () => {
    const promo = { id: "promo-1", label: "10% Rabatt" };
    mockAppliedPromotionCodes.value = [promo];
    const wrapper = await mountSuspended(CheckoutVoucherInput);

    const removeButtons = wrapper.findAll(
      'button[aria-label="Gutschein entfernen"]',
    );
    expect(removeButtons).toHaveLength(1);
    await removeButtons[0]!.trigger("click");

    expect(mockRemoveItem).toHaveBeenCalledWith(promo);
  });
});
