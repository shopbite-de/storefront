<script setup lang="ts">
import ProductCard from "~/components/Product/Card.vue";

// The top sellers (`markAsTopseller`) as a grid of the regular product
// cards; a tap opens the quick view (#325). Replaces the horizontal
// scroller and the marquee of the old home page (#388). Renders nothing
// without top sellers.
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    headline?: string;
  }>(),
  {
    title: "Beliebt bei unseren Gästen",
    description: undefined,
    headline: undefined,
  },
);

const { loadTopSellers } = useTopSellers();

const { data: topSellers } = await useAsyncData("top-sellers", () =>
  loadTopSellers(),
);

const products = computed(() => topSellers.value ?? []);
const quickView = useProductQuickView(products);
</script>

<template>
  <UPageSection
    v-if="products.length > 0"
    id="highlights"
    :title="title"
    :description="description"
    :headline="headline"
    :links="[
      {
        label: 'Zur Speisekarte',
        to: '/speisekarte/',
        color: 'primary',
        variant: 'subtle',
        trailingIcon: 'i-lucide-arrow-right',
      },
    ]"
    :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
  >
    <div
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="highlights"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :with-favorite-button="false"
        :selectable="true"
        @select="quickView.show"
      />
    </div>
    <LazyProductQuickView
      v-if="quickView.mounted.value"
      v-model:open="quickView.open.value"
      :product="quickView.product.value"
    />
  </UPageSection>
</template>
