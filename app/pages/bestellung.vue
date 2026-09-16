<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";

const stepRoutes = [
  "/bestellung/warenkorb",
  "/bestellung/zahlung-versand",
  "/bestellung/bestaetigen",
] as const;

const route = useRoute();
const isPaymentReturnRoute = computed(() =>
  /^\/bestellung\/[0-9a-f]{32}(\/erfolg|\/fehler)?$/.test(route.path),
);

// The active step follows the route, so the server renders the same step the
// browser hydrates. Setting it from the child pages ran after the stepper had
// been rendered on the server (#339).
const step = computed<number>({
  get: () =>
    Math.max(
      0,
      stepRoutes.findIndex((path) => path === route.path),
    ),
  set: (index) => {
    const path = stepRoutes[index];
    if (path && path !== route.path) {
      navigateTo(path);
    }
  },
});

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
</script>

<template>
  <UPageSection>
    <template v-if="isPaymentReturnRoute">
      <NuxtPage />
    </template>
    <UStepper v-else ref="stepper" v-model="step" :items="items" size="lg">
      <template #content>
        <NuxtPage />
      </template>
    </UStepper>
  </UPageSection>
</template>
