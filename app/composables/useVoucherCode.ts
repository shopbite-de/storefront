export function useVoucherCode() {
  const { cart, addPromotionCode, appliedPromotionCodes, removeItem } =
    useCart();
  const toast = useToast();

  const voucherCode = ref("");
  const voucherLoading = ref(false);

  async function applyVoucher() {
    const code = voucherCode.value.trim();
    if (!code || voucherLoading.value) return;
    voucherLoading.value = true;
    try {
      await addPromotionCode(code);
      const errors = cart.value?.errors ?? {};
      const promotionError = Object.values(errors).find(
        (e) => (e as { promotionCode?: string }).promotionCode === code,
      ) as { translatedMessage?: string } | undefined;
      if (promotionError) {
        toast.add({
          title: "Gutschein ungültig",
          description:
            promotionError.translatedMessage ??
            "Der eingegebene Gutscheincode ist ungültig oder abgelaufen.",
          color: "error",
          icon: "i-lucide-x-circle",
        });
      } else {
        voucherCode.value = "";
      }
    } catch {
      toast.add({
        title: "Gutschein ungültig",
        description:
          "Der eingegebene Gutscheincode ist ungültig oder abgelaufen.",
        color: "error",
        icon: "i-lucide-x-circle",
      });
    } finally {
      voucherLoading.value = false;
    }
  }

  return {
    voucherCode,
    voucherLoading,
    applyVoucher,
    appliedPromotionCodes,
    removeItem,
  };
}
