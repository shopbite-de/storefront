import type { Cart } from "../../shared/domain";

/**
 * The checkout's voucher field (#445): vouchers through the BFF
 * (`/api/cart/vouchers`, ADR 0001 step 4). A code that does not apply
 * comes back as a `voucher_invalid` message about it; the error shows at
 * the field, no toast, in the shop's words for the code (ADR 0002): the
 * message's text is the backend's, in the backend's language.
 */
export function useVoucherCode() {
  const { discounts, setCart } = useCartData();

  const voucherCode = ref("");
  const voucherLoading = ref(false);
  const voucherError = ref<string | null>(null);
  const { t } = useI18n();
  const invalid = () => t("order.voucher.invalid");

  async function applyVoucher() {
    const code = voucherCode.value.trim();
    if (!code || voucherLoading.value) return;
    voucherLoading.value = true;
    voucherError.value = null;
    try {
      const cart = await queuedWrite(() =>
        withStaleRetry(() =>
          $fetch<Cart>("/api/cart/vouchers", {
            method: "POST",
            body: { code },
          }),
        ),
      );
      setCart(cart);
      const refused = cart.messages.find(
        (message) =>
          message.code === "voucher_invalid" && message.subjectId === code,
      );
      if (refused) {
        voucherError.value = invalid();
      } else {
        voucherCode.value = "";
      }
    } catch {
      voucherError.value = invalid();
    } finally {
      voucherLoading.value = false;
    }
  }

  /** Discounts from a voucher; automatic ones cannot be removed. */
  const appliedVouchers = computed(() =>
    discounts.value.filter((discount) => discount.code !== null),
  );

  async function removeVoucher(code: string) {
    try {
      setCart(
        await queuedWrite(() =>
          withStaleRetry(() =>
            $fetch<Cart>(`/api/cart/vouchers/${encodeURIComponent(code)}`, {
              method: "DELETE",
            }),
          ),
        ),
      );
    } catch (error) {
      console.error("[voucher][remove]", error);
    }
  }

  return {
    voucherCode,
    voucherLoading,
    voucherError,
    applyVoucher,
    appliedVouchers,
    removeVoucher,
  };
}
