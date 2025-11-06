<script setup lang="ts">
import type { Schemas } from "#shopware";

useSeoMeta({
  title: "Speisekarte | Pizzeria La Fattoria",
});

definePageMeta({
  layout: "listing",
});

const { loadNavigationElements, navigationElements } = useNavigation();
await loadNavigationElements({ depth: 1 });

const searchBarRef = ref<{
  showSuggest: boolean;
  loading: boolean;
  products: Schemas["Product"];
} | null>(null);

const searchInProgress = ref(false);
</script>

<template>
  <div>
    <div
      class="sticky top-16 left-0 z-10 w-full px-4 md:px-6 lg:px-8"
    >
      <NavigationMobileTop v-if="!searchInProgress" />
      <ProductSearchBar
        ref="searchBarRef"
        v-model:search-in-progress="searchInProgress"
      />
    </div>
    <div
      v-if="searchBarRef?.showSuggest"
      class="flex flex-col gap-4 mt-4 px-4 md:px-6 lg:px-8 "
    >
      <div v-if="!searchBarRef?.loading" class="flex flex-col gap-4">
        <ProductCard
          v-for="product in searchBarRef?.products"
          :key="product.id"
          :product="product"
          :with-favorite-button="true"
          :with-add-to-cart-button="true"
        />
      </div>
    </div>
    <div v-else class="px-4 md:px-6 lg:px-8">
      <ProductCategory
        v-for="category in navigationElements"
        :key="category.id"
        :category="category"
      />
    </div>
  </div>
</template>
