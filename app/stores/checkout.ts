const stepRoutes = [
  "/bestellung/warenkorb",
  "/bestellung/zahlung-versand",
  "/bestellung/bestaetigen",
] as const;

export const useCheckoutStore = defineStore("checkout", () => {
  const step = ref(0);

  function setStep(index: number) {
    step.value = index;
  }

  async function navigateToStep(index: number) {
    if (index < 0 || index >= stepRoutes.length) return;
    if (index <= step.value) {
      await navigateTo(stepRoutes[index]);
    }
  }

  return { step, setStep, navigateToStep };
});
