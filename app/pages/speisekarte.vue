<script setup lang="ts">
import type { Schemas } from "#shopware";

const {
  public: { site },
} = useRuntimeConfig();

const pageTitle = computed(() => `Speisekarte | ${site?.name}`);

useSeoMeta({ title: pageTitle });

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
  <div v-if="navigationElements">
    <div class="sticky top-16 left-0 z-20 w-full backdrop-blur-md rounded-md">
      <NavigationMobileTop v-if="!searchInProgress" class="" />
      <ProductSearchBar
        ref="searchBarRef"
        v-model:search-in-progress="searchInProgress"
      />
    </div>
    <div v-if="searchBarRef?.showSuggest" class="flex flex-col gap-4 mt-4">
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
    <div v-else>
      <ProductCategory
        v-for="category in navigationElements"
        :key="category.id"
        :category="category"
      />
    </div>
  </div>
  <div v-else>Loading...</div>
</template>
