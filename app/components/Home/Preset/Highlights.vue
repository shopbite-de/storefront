<script setup lang="ts">
/**
 * "Oft bestellt" of the presets (#444): the top sellers as bon cards with
 * quick add, a tap on the name opens the quick view. Renders nothing
 * without top sellers.
 */
withDefaults(
  defineProps<{
    title?: string;
  }>(),
  { title: "Oft bestellt" },
);

const { loadTopSellers } = useTopSellers();
const { data: topSellers } = await useAsyncData("top-sellers", () =>
  loadTopSellers(),
);

const products = computed(() => topSellers.value ?? []);
const quickView = useProductQuickView(products);
const { menuView } = useThemePreset();
</script>

<template>
  <section
    v-if="products.length"
    id="highlights"
    aria-labelledby="home-highlights-title"
    class="mx-auto max-w-[1248px] px-5 py-14 sm:px-8 sm:py-24"
  >
    <div class="mb-7 flex items-baseline justify-between gap-5">
      <h2
        id="home-highlights-title"
        class="font-display text-[32px] leading-tight text-sb-ink sm:text-5xl"
      >
        {{ title }}
      </h2>
      <NuxtLink
        to="/speisekarte/"
        class="inline-flex min-h-11 items-center font-body font-bold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
      >
        Zur Speisekarte
      </NuxtLink>
    </div>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      <MenuBonCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :photo="menuView === 'bonPhoto'"
        :href="productDeepLink(product)"
        @select="quickView.show"
      />
    </div>
    <LazyProductQuickView
      v-if="quickView.mounted.value"
      v-model:open="quickView.open.value"
      :product="quickView.product.value"
    />
  </section>
</template>
