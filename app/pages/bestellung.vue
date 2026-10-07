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

// Presets use the one-page checkout (#443): the step pages redirect there,
// and the page sits in the plain container instead of UPageSection.
const { hasPreset } = useThemePreset();
if (hasPreset && (stepRoutes as readonly string[]).includes(route.path)) {
  await navigateTo("/bestellung/kasse", { replace: true });
}

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
  <div
    v-if="hasPreset && !isPaymentReturnRoute"
    class="mx-auto w-full max-w-(--sb-container) px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:px-8"
  >
    <NuxtPage />
  </div>
  <UPageSection v-else>
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
