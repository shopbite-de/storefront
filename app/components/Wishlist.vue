<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    showMenuButton?: boolean;
  }>(),
  {
    showMenuButton: false,
  },
);

const { getWishlistProducts, items, clearWishlist } = useWishlist();
const { apiClient } = useShopwareContext();
const { addProducts, refreshCart } = useCart();
const toast = useToast();
const { triggerProductAdded } = useProductEvents();

const products = ref<Schemas["Product"][]>([]);
const isLoading = ref(false);
const isAddingToCart = ref(false);
const addingItemId = ref<string | null>(null);

const clearWishlistHandler = async () => {
  try {
    isLoading.value = true;
    clearWishlist();
    toast.add({
      title: "Merkliste geleert",
      description: "Alle Produkte wurden von der Merkliste entfernt.",
      icon: "i-lucide-trash",
      color: "neutral",
    });
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

const addSingleItemToCart = async (product: Schemas["Product"]) => {
  try {
    addingItemId.value = product.id;
    
    console.log("[wishlist][addSingleItemToCart] Adding product:", {
      id: product.id,
      productNumber: product.productNumber,
      name: product.translated.name,
      childCount: product.childCount,
    });
    
    // Check if this is a base product with variants
    const isBaseProduct = product.childCount && product.childCount > 0;
    if (isBaseProduct) {
      console.warn("[wishlist][addSingleItemToCart] Cannot add base product with variants");
      toast.add({
        title: "Variante erforderlich",
        description: `${product.translated.name} hat Varianten. Bitte wähle eine spezifische Variante aus.`,
        icon: "i-lucide-alert-circle",
        color: "warning",
      });
      return;
    }
    
    const cartItems = [
      {
        id: product.id,
        quantity: 1,
        type: "product" as const,
      },
    ];
    
    const newCart = await addProducts(cartItems);
    await refreshCart(newCart);
    
    console.log("[wishlist][addSingleItemToCart] Product added successfully");
    
    triggerProductAdded();
    
    toast.add({
      title: "In den Warenkorb gelegt",
      description: `${product.translated.name} wurde hinzugefügt.`,
      icon: "i-lucide-shopping-cart",
      color: "primary",
    });
    
    useTrackEvent("add_to_cart", {
      props: {
        product_number: product.productNumber,
        quantity: 1,
      },
    });
  } catch (error) {
    console.error("[wishlist][addSingleItemToCart] Error details:", error);
    toast.add({
      title: "Fehler",
      description: "Produkt konnte nicht hinzugefügt werden.",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    addingItemId.value = null;
  }
};

const addAllItemsToCart = async () => {
  if (products.value.length === 0) {
    console.warn("[wishlist][addAllItemsToCart] No products to add");
    return;
  }
  
  try {
    isAddingToCart.value = true;
    
    console.log("[wishlist][addAllItemsToCart] Adding products:", products.value.length);
    
    // Filter out base products (parent products with childCount > 0)
    // Only add actual variants or simple products
    const addableProducts = products.value.filter((product) => {
      const isBaseProduct = product.childCount && product.childCount > 0;
      if (isBaseProduct) {
        console.warn("[wishlist][addAllItemsToCart] Skipping base product:", product.productNumber, product.translated.name);
      }
      return !isBaseProduct;
    });
    
    if (addableProducts.length === 0) {
      toast.add({
        title: "Keine Produkte hinzugefügt",
        description: "Bitte wähle zuerst Varianten für deine Produkte aus.",
        icon: "i-lucide-alert-circle",
        color: "warning",
      });
      return;
    }
    
    const cartItems = addableProducts.map((product) => ({
      id: product.id,
      quantity: 1,
      type: "product" as const,
    }));
    
    console.log("[wishlist][addAllItemsToCart] Cart items:", cartItems);
    
    const newCart = await addProducts(cartItems);
    await refreshCart(newCart);
    
    triggerProductAdded();
    
    const skippedCount = products.value.length - addableProducts.length;
    const successMessage = skippedCount > 0
      ? `${addableProducts.length} Produkte hinzugefügt. ${skippedCount} Produkt(e) übersprungen (Varianten müssen einzeln ausgewählt werden).`
      : `${addableProducts.length} Produkte wurden in den Warenkorb gelegt.`;
    
    toast.add({
      title: "Produkte hinzugefügt",
      description: successMessage,
      icon: "i-lucide-shopping-cart",
      color: "primary",
    });
    
    useTrackEvent("add_to_cart", {
      props: {
        product_count: addableProducts.length,
        skipped_count: products.value.length - addableProducts.length,
        source: "wishlist_bulk",
      },
    });
    
    console.log("[wishlist][addAllItemsToCart] Success");
  } catch (error) {
    console.error("[wishlist][addAllItemsToCart] Error:", error);
    toast.add({
      title: "Fehler",
      description: "Produkte konnten nicht hinzugefügt werden.",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  } finally {
    isAddingToCart.value = false;
  }
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
    <!-- Header -->
    <div class="flex flex-row items-center gap-3">
      <h2 class="text-2xl font-bold">Merkliste</h2>
    </div>

    <!-- Primary Action - Add All to Cart -->
    <div v-if="products.length > 0">
      <UButton
        icon="i-lucide-shopping-cart"
        color="primary"
        variant="solid"
        size="xl"
        block
        :loading="isAddingToCart"
        @click="addAllItemsToCart"
        class="font-semibold shadow-md"
      >
        Alle in den Warenkorb ({{ products.length }})
      </UButton>
    </div>

    <!-- Empty State -->
    <UPageCard
      v-if="products.length === 0 && !isLoading"
      class="text-center"
    >
      <div class="flex flex-col items-center justify-center gap-4 py-8">
        <UIcon
          name="i-lucide-heart-off"
          class="size-16 text-neutral-400"
        />
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
        v-for="product in products"
        :key="product.id"
      >
        <div class="relative">
          <UPageCard variant="outline" :ui="{ root: 'shadow-sm hover:shadow-md transition-shadow' }">
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
                      <h3 class="text-sm font-semibold text-highlighted line-clamp-2 leading-tight">
                        {{ product.translated.name }}
                      </h3>
                      <p class="text-base font-bold text-primary-600">
                        {{ usePrice({ currencyCode: 'EUR', localeCode: 'de-DE' }).getFormattedPrice(product.calculatedPrice.totalPrice) }}
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

      <!-- Secondary Actions -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-800">
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="md"
          block
          :disabled="isLoading"
          @click="clearWishlistHandler"
        >
          Merkliste leeren
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
