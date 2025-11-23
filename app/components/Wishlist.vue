<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    showMenuButton?: boolean;
    useGridLayout?: boolean;
  }>(),
  {
    showMenuButton: false,
    useGridLayout: false,
  },
);

const { getWishlistProducts, items } = useWishlist();
const { apiClient } = useShopwareContext();
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
  <div class="flex flex-col gap-6">
    <!-- Primary Action - Add All to Cart -->
    <div v-if="products.length > 0">
      <UButton
        icon="i-lucide-shopping-cart"
        color="primary"
        variant="solid"
        size="xl"
        block
        :loading="isAddingToCart"
        class="font-semibold shadow-md"
        @click="addAllItemsToCart(products)"
      >
        Alle in den Warenkorb ({{ products.length }})
      </UButton>
    </div>

    <!-- Empty State -->
    <UPageCard v-if="products.length === 0 && !isLoading" class="text-center">
      <div class="flex flex-col items-center justify-center gap-4 py-8">
        <UIcon name="i-lucide-heart-off" class="size-16 text-neutral-400" />
        <div class="flex flex-col gap-2">
          <h3 class="text-lg font-semibold text-highlighted">
            Keine Produkte auf der Merkliste
          </h3>
          <p class="text-sm text-neutral-500">
            Füge deine Lieblingsprodukte zur Merkliste hinzu, um sie später
            schnell wiederzufinden.
          </p>
        </div>
        <NuxtLink v-if="showMenuButton" to="/speisekarte">
          <UButton
            icon="i-lucide-utensils"
            color="primary"
            variant="solid"
            size="lg"
          >
            Zur Speisekarte
          </UButton>
        </NuxtLink>
      </div>
    </UPageCard>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col gap-4">
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-32 w-full" />
    </div>

    <!-- Products List -->
    <div v-if="products.length > 0" class="flex flex-col gap-4">
      <!-- Product Items -->
      <div
        :class="
          props.useGridLayout
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-4'
        "
      >
        <div v-for="product in products" :key="product.id">
          <div class="relative">
            <UPageCard
              variant="outline"
              :ui="{ root: 'shadow-sm hover:shadow-md transition-shadow' }"
            >
              <div class="flex flex-col gap-3">
                <!-- Product Info with Heart Button -->
                <div class="flex flex-row gap-3 items-start justify-between">
                  <div class="flex flex-row gap-3 items-start flex-1 min-w-0">
                    <div
                      v-if="product.cover?.media?.url"
                      class="flex-shrink-0 w-16 h-16"
                    >
                      <NuxtImg
                        :src="product.cover.media.url"
                        class="rounded-md w-full h-full object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-col gap-1">
                        <span class="text-xs text-brand-500 font-medium">
                          #{{ product.productNumber }}
                        </span>
                        <h3
                          class="text-sm font-semibold text-highlighted line-clamp-2 leading-tight"
                        >
                          {{ product.translated.name }}
                        </h3>
                        <p class="text-base font-bold text-primary-600">
                          {{
                            usePrice({
                              currencyCode: "EUR",
                              localeCode: "de-DE",
                            }).getFormattedPrice(
                              product.calculatedPrice.totalPrice,
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <!-- Heart Button -->
                  <div class="flex-shrink-0">
                    <AddToWishlist :product="product" />
                  </div>
                </div>

                <!-- Add to Cart Button -->
                <UButton
                  icon="i-lucide-shopping-cart"
                  color="primary"
                  variant="solid"
                  size="md"
                  block
                  :loading="addingItemId === product.id"
                  @click="addSingleItemToCart(product)"
                >
                  In den Warenkorb
                </UButton>
              </div>
            </UPageCard>
          </div>
        </div>
      </div>

      <!-- Secondary Actions -->
      <div
        class="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-2"
      >
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="md"
          class="flex-1"
          :disabled="isLoading"
          @click="clearWishlistHandler"
        >
          Merkliste leeren
        </UButton>

        <NuxtLink v-if="showMenuButton" to="/speisekarte" class="flex-1">
          <UButton
            icon="i-lucide-utensils"
            color="neutral"
            variant="outline"
            size="md"
            block
          >
            Zur Speisekarte
          </UButton>
        </NuxtLink>
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
