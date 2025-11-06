<script setup lang="ts">
import type { Schemas } from "#shopware";

const { getWishlistProducts, items, clearWishlist } = useWishlist();
const { apiClient } = useShopwareContext();
const products = ref<Schemas["Product"][]>([]);
const isLoading = ref(false);

const clearWishlistHandler = async () => {
  try {
    isLoading.value = true;
    clearWishlist();
  } finally {
    isLoading.value = false;
  }
};
const loadProductsByItemIds = async (itemIds: string[]): Promise<void> => {
  isLoading.value = true;

  try {
    const { data } = await apiClient.invoke("readProduct post /product", {
      body: { ids: itemIds || items.value },
    });

    if (data?.elements) {
      products.value = data.elements;
    }
  } catch (error) {
    console.error("[wishlist][loadProductsByItemIds]", error);
  }

  isLoading.value = false;
};

watch(
  items,
  (items, oldItems) => {
    if (items.length !== oldItems?.length) {
      products.value = products.value.filter(({ id }: { id: string }) =>
        items.includes(id),
      );
    }
    if (!items.length) {
      return;
    }
    loadProductsByItemIds(items);
  },
  {
    immediate: true,
  },
);

onMounted(async () => {
  await getWishlistProducts();
});
</script>

<template>
  <div>
    <h2 class="text-2xl">Merkliste</h2>
    <div class="flex flex-col gap-4 h-full">
      <div
        v-if="products.length === 0"
        class="flex flex-row items-center gap-2"
      >
        <UIcon name="i-lucide-frown" class="size-5" />
        <p>Keine Produkte</p>
      </div>
      <div class="flex flex-col gap-4">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :with-favorite-button="true"
          :with-add-to-cart-button="false"
        />
        <UButton
          v-if="products.length > 0"
          color="neutral"
          variant="outline"
          icon="i-lucide-trash"
          @click="clearWishlistHandler"
        >
          Alles löschen
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "tailwindcss";
@import "@nuxt/ui";

h1 {
  @apply text-3xl sm:text-4xl lg:text-5xl text-pretty tracking-tight font-bold text-highlighted my-14;
}

h2 {
  @apply mt-0 text-2xl sm:text-3xl lg:text-4xl text-pretty tracking-tight font-bold text-highlighted my-10;
}
</style>
