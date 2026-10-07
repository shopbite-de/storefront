<script setup lang="ts">
/**
 * Cart next to the menu on desktop (#443): order mode, the cart lines with
 * steppers, totals and "Zur Kasse". Phones use the cart bar and the sheet.
 * The cart loads on the client, so the panel renders after mounting.
 */
const { isCheckoutEnabled } = useShopBiteConfig();
</script>

<template>
  <aside
    v-if="isCheckoutEnabled"
    aria-labelledby="cart-panel-title"
    class="sticky top-6 flex flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6 font-body text-sb-ink"
  >
    <h2 id="cart-panel-title" class="font-display text-[28px] leading-none">
      Ihre Bestellung
    </h2>
    <MenuOrderMode />
    <ClientOnly>
      <LazyCartQuickView :with-to-cart-button="true" />
    </ClientOnly>
  </aside>
</template>
