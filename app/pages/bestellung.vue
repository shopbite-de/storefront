<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";

const checkoutStore = useCheckoutStore();
const { step } = storeToRefs(checkoutStore);

const stepRoutes = [
  "/bestellung/warenkorb",
  "/bestellung/zahlung-versand",
  "/bestellung/bestaetigen",
] as const;

const items = computed(
  () =>
    [
      {
        title: "Warenkorb",
        icon: "i-lucide-shopping-cart",
        disabled: false,
      },
      {
        title: "Zahlung & Versand",
        icon: "i-lucide-truck",
        disabled: step.value < 1,
      },
      {
        title: "Prüfen & Bestellen",
        icon: "i-lucide-check",
        disabled: step.value < 2,
      },
    ] satisfies StepperItem[],
);

watch(step, (newStep) => {
  navigateTo(stepRoutes[newStep]);
});
</script>

<template>
  <UPageSection>
    <UStepper ref="stepper" v-model="step" :items="items" size="lg">
      <template #content>
        <NuxtPage />
      </template>
    </UStepper>
  </UPageSection>
</template>
