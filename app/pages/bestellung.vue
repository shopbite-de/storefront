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

// Presets: a numbered step list in the display font (#443).
const { hasPreset } = useThemePreset();

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
    <div
      v-else-if="hasPreset"
      class="flex flex-col gap-8 font-body text-sb-ink"
    >
      <nav aria-label="Bestellschritte">
        <ol class="grid grid-cols-3 gap-2 sm:gap-4">
          <li
            v-for="(item, index) in items"
            :key="item.title"
            class="border-t-[1.5px] pt-3"
            :class="index <= step ? 'border-sb-ink' : 'border-sb-line'"
          >
            <NuxtLink
              v-if="index < step"
              :to="stepRoutes[index]"
              class="flex min-h-11 flex-col gap-0.5 text-sm hover:text-sb-primary-ink sm:flex-row sm:items-baseline sm:gap-3 sm:text-base focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus"
            >
              <span class="font-display text-2xl">{{ index + 1 }}</span>
              <span class="font-semibold underline underline-offset-4">{{
                item.title
              }}</span>
            </NuxtLink>
            <span
              v-else
              class="flex min-h-11 flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:gap-3 sm:text-base"
              :class="index === step ? '' : 'text-sb-ink-muted'"
              :aria-current="index === step ? 'step' : undefined"
            >
              <span class="font-display text-2xl">{{ index + 1 }}</span>
              <span :class="index === step ? 'font-bold' : ''">{{
                item.title
              }}</span>
            </span>
          </li>
        </ol>
      </nav>
      <NuxtPage />
    </div>
    <UStepper v-else ref="stepper" v-model="step" :items="items" size="lg">
      <template #content>
        <NuxtPage />
      </template>
    </UStepper>
  </UPageSection>
</template>
