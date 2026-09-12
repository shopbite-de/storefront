<script setup lang="ts">
// Top sellers as a horizontal snap scroller below the hero (#327); a tap
// opens the product quick view (#325). Renders nothing without top sellers.
const { loadTopSellers } = useTopSellers();

const { data: topSellers } = await useAsyncData("top-sellers", () =>
  loadTopSellers(),
);

const products = computed(() => topSellers.value ?? []);
const quickView = useProductQuickView(products);
</script>

<template>
  <section v-if="products.length > 0" aria-labelledby="top-sellers-title">
    <UContainer class="flex flex-col gap-3 pt-6 sm:pt-8">
      <div class="flex items-baseline justify-between gap-4">
        <h2
          id="top-sellers-title"
          class="text-xl font-extrabold tracking-tight text-highlighted sm:text-2xl"
        >
          Beliebt bei unseren Gästen
        </h2>
        <UButton
          label="Speisekarte"
          to="/speisekarte/"
          variant="link"
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          class="shrink-0 px-0"
        />
      </div>
    </UContainer>
    <!-- Scrolls edge to edge on phones, padded like the container. -->
    <div
      class="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 pb-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="mx-auto flex w-full max-w-(--ui-container) gap-3">
        <ProductCardCompact
          v-for="product in products"
          :key="product.id"
          :product="product"
          @select="quickView.show"
        />
      </div>
    </div>
    <LazyProductQuickView
      v-if="quickView.mounted.value"
      v-model:open="quickView.open.value"
      :product="quickView.product.value"
    />
  </section>
</template>
