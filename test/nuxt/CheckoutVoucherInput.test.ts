import { describe, it, expect, vi, beforeEach } from "vitest";
import { computed, ref, nextTick } from "vue";
import {
  mountSuspended,
  mockNuxtImport,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { readBody, type H3Event } from "h3";
import CheckoutVoucherInput from "~/components/Checkout/VoucherInput.vue";
import type { Cart, CartDiscount } from "../../shared/domain";
import { eur } from "../support/dishes";
import { cart } from "../support/cart";

const { mockApply, mockRemove, mockSetCart } = vi.hoisted(() => ({
  mockApply: vi.fn(),
  mockRemove: vi.fn(),
  mockSetCart: vi.fn(),
}));

registerEndpoint("/api/cart/vouchers", async (event: H3Event) =>
  mockApply(await readBody(event)),
);
registerEndpoint("/api/cart/vouchers/RABATT10", (event: H3Event) =>
  mockRemove(event.method),
);

const discounts = ref<CartDiscount[]>([]);

mockNuxtImport("useCartData", () => () => ({
  discounts: computed(() => discounts.value),
  setCart: mockSetCart,
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("CheckoutVoucherInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApply.mockResolvedValue(cart());
    mockRemove.mockResolvedValue(cart());
    discounts.value = [];
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

  it("sends the code once while a request is in flight, field disabled", async () => {
    let resolveApply!: (value: Cart) => void;
    mockApply.mockReturnValueOnce(
      new Promise<Cart>((resolve) => {
        resolveApply = resolve;
      }),
    );

    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await nextTick();

    wrapper.find("form").trigger("submit");
    await nextTick();
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    expect(wrapper.find("input").attributes("disabled")).toBeDefined();

    await vi.waitFor(() => expect(mockApply).toHaveBeenCalledTimes(1));
    resolveApply(cart());
    await settle();

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(wrapper.find("input").attributes("disabled")).toBeUndefined();
  });

  it("clears the input and shows no error on successful voucher apply", async () => {
    const applied = cart({
      discounts: [{ code: "SAVE10", name: "10% Rabatt", amount: eur(-100) }],
    });
    mockApply.mockResolvedValue(applied);
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await wrapper.find("form").trigger("submit");
    await settle();

    expect(mockApply).toHaveBeenCalledWith({ code: "SAVE10" });
    expect(mockSetCart).toHaveBeenCalledWith(applied);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find("input").element.value).toBe("");
  });

  it("shows the shop's own message for voucher_invalid, not the backend's text", async () => {
    mockApply.mockResolvedValue(
      cart({
        messages: [
          {
            code: "voucher_invalid",
            severity: "error",
            text: 'Gutscheincode "INVALID" existiert nicht.',
            subjectId: "INVALID",
          },
        ],
      }),
    );
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("INVALID");
    await wrapper.find("form").trigger("submit");
    await settle();

    const alert = wrapper.find('[role="alert"]');
    // the backend's text is in its own language, the field in the shop's
    expect(alert.text()).toBe(useI18n().t("order.voucher.invalid"));
    expect(alert.text()).not.toContain("existiert nicht");
    expect(wrapper.find("input").attributes("aria-describedby")).toBe(
      alert.attributes("id"),
    );
    expect(wrapper.find("input").element.value).toBe("INVALID");
  });

  it("shows a generic error at the field when the request fails", async () => {
    mockApply.mockRejectedValueOnce(new Error("network error"));
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue("SAVE10");
    await wrapper.find("form").trigger("submit");
    await settle();

    expect(wrapper.find('[role="alert"]').text()).toBe(
      "Der Gutscheincode ist ungültig oder abgelaufen.",
    );
  });

  it("submits the trimmed code with the form", async () => {
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    await wrapper.find("input").setValue(" ENTER10 ");
    await wrapper.find("form").trigger("submit");
    await settle();

    expect(mockApply).toHaveBeenCalledWith({ code: "ENTER10" });
  });

  it("lists the vouchers in the cart, not the automatic discounts", async () => {
    discounts.value = [
      { code: "RABATT10", name: "10% Rabatt", amount: eur(-100) },
      { code: "VERSAND", name: "Gratis Versand", amount: eur(-250) },
      { code: null, name: "Mittagsrabatt", amount: eur(-150) },
    ];
    const wrapper = await mountSuspended(CheckoutVoucherInput);
    expect(wrapper.text()).toContain("10% Rabatt");
    expect(wrapper.text()).toContain("Gratis Versand");
    expect(wrapper.text()).not.toContain("Mittagsrabatt");
  });

  it("removes a voucher by its code", async () => {
    discounts.value = [
      { code: "RABATT10", name: "10% Rabatt", amount: eur(-100) },
    ];
    const wrapper = await mountSuspended(CheckoutVoucherInput);

    const removeButtons = wrapper.findAll(
      'button[aria-label="Gutschein 10% Rabatt entfernen"]',
    );
    expect(removeButtons).toHaveLength(1);
    await removeButtons[0]!.trigger("click");

    await vi.waitFor(() => expect(mockRemove).toHaveBeenCalledWith("DELETE"));
  });
});
