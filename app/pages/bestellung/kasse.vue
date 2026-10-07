<script setup lang="ts">
// One-page checkout of the presets (#443): delivery or pickup, time,
// customer data, payment and the order on one page. Shops without a
// preset keep the three steps.
useSeoMeta({
  title: "Kasse",
  robots: "noindex, nofollow",
});

const { hasPreset } = useThemePreset();
if (!hasPreset) {
  await navigateTo("/bestellung/warenkorb", { replace: true });
}

const { isEmpty } = useCart();
</script>

<template>
  <div class="flex flex-col gap-6 py-2 font-body text-sb-ink sm:gap-8">
    <h1 class="font-display text-4xl leading-none sm:text-5xl">Kasse</h1>
    <ClientOnly>
      <div
        v-if="isEmpty"
        class="flex flex-col items-start gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
      >
        <p>Ihr Warenkorb ist noch leer.</p>
        <SbButton to="/speisekarte/">Zur Speisekarte</SbButton>
      </div>
      <CheckoutSummary v-else />
      <template #fallback>
        <div class="h-96" aria-busy="true" aria-label="Kasse wird geladen" />
      </template>
    </ClientOnly>
  </div>
</template>
