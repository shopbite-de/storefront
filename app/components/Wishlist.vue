<script setup lang="ts">
import type { Schemas } from "#shopware";

withDefaults(defineProps<{ showMenuButton?: boolean }>(), {
  showMenuButton: false,
});

const { getWishlistProducts, items } = useWishlist();
const { apiClient } = useShopwareContext();
const { getFormattedPrice } = useCommercePrice();
const {
  isAddingToCart,
  addingItemId,
  isLoading,
  clearWishlistHandler,
  addSingleItemToCart,
  addAllItemsToCart,
} = useWishlistActions();

const products = ref<Schemas["Product"][]>([]);

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
  <div class="flex flex-col gap-6 font-body text-sb-ink">
    <p
      v-if="isLoading && !products.length"
      role="status"
      class="text-sb-ink-muted"
    >
      Merkliste wird geladen …
    </p>
    <div
      v-else-if="!products.length"
      class="flex flex-col items-start gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
    >
      <p>Ihre Merkliste ist leer.</p>
      <SbButton v-if="showMenuButton" to="/speisekarte/"
        >Zur Speisekarte</SbButton
      >
    </div>
    <template v-else>
      <ul
        class="flex flex-col overflow-hidden rounded-sb-card border border-sb-line bg-sb-surface"
      >
        <li
          v-for="product in products"
          :key="product.id"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-sb-line p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <p class="min-w-0">
            <span
              class="block font-bold [overflow-wrap:anywhere] hyphens-auto"
              >{{ product.translated?.name ?? product.name }}</span
            >
            <span class="text-sm text-sb-ink-muted tabular-nums"
              >Nr. {{ product.productNumber }} ·
              {{ getFormattedPrice(product.calculatedPrice?.totalPrice) }}</span
            >
          </p>
          <AddToWishlist :product="product" />
          <SbButton
            variant="tint"
            class="col-span-full sm:col-span-1"
            :loading="addingItemId === product.id"
            @click="addSingleItemToCart(product)"
          >
            In den Warenkorb
            <span class="sr-only"
              >: {{ product.translated?.name ?? product.name }}</span
            >
          </SbButton>
        </li>
      </ul>
      <div class="flex flex-col gap-3 sm:flex-row">
        <SbButton :loading="isAddingToCart" @click="addAllItemsToCart(products)"
          >Alle in den Warenkorb</SbButton
        >
        <SbButton variant="ghost" @click="clearWishlistHandler"
          >Merkliste leeren</SbButton
        >
      </div>
    </template>
  </div>
</template>
