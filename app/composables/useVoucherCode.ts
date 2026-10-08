export function useVoucherCode() {
  const { cart, addPromotionCode, appliedPromotionCodes, removeItem } =
    useCart();

  const voucherCode = ref("");
  const voucherLoading = ref(false);
  // shown at the field (#445), no toast
  const voucherError = ref<string | null>(null);
  const INVALID = "Der Gutscheincode ist ungültig oder abgelaufen.";

  async function applyVoucher() {
    const code = voucherCode.value.trim();
    if (!code || voucherLoading.value) return;
    voucherLoading.value = true;
    voucherError.value = null;
    try {
      await addPromotionCode(code);
      const errors = cart.value?.errors ?? {};
      const promotionError = Object.values(errors).find(
        (e) => (e as { promotionCode?: string }).promotionCode === code,
      ) as { translatedMessage?: string } | undefined;
      if (promotionError) {
        voucherError.value = promotionError.translatedMessage ?? INVALID;
      } else {
        voucherCode.value = "";
      }
    } catch {
      voucherError.value = INVALID;
    } finally {
      voucherLoading.value = false;
    }
  }

  return {
    voucherCode,
    voucherLoading,
    voucherError,
    applyVoucher,
    appliedPromotionCodes,
    removeItem,
  };
}
