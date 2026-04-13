<script setup lang="ts">
import type { Product } from "~/types/commerce/product";

export type MarqueeItem = {
  productId: string;
  image: string;
};

const props = defineProps<MarqueeItem>();

const { productId, image } = toRefs(props);

const { product } = await $fetch<{ product: Product }>(
  `/api/product/${productId.value}`,
);

const CART_SUCCESS_TITLE = "Gute Wahl!";

const { addProducts } = useCommerceCart();
const toast = useToast();

const alt = computed(() => product.name + " #" + product.productNumber);

async function showSuccessToast() {
  toast.add({
    title: CART_SUCCESS_TITLE,
    description: `${product.translated.name} wurde in den Warenkorb gelegt.`,
    icon: "i-lucide-shopping-cart",
    color: "success",
    progress: false,
  });
}

async function addToCart(productId: string) {
  await addProducts([{ id: productId, quantity: 1, type: "product" }]);
  await showSuccessToast();
}
</script>

<template>
  <div v-if="product" :id="product.id" class="relative inline-block">
    <NuxtImg
      :src="image"
      :alt="alt"
      class="rounded-lg shadow-2xl ring ring-default h-50 md:h-80"
    />
    <div
      class="absolute bottom-0 left-0 right-0 bg-black/60 text-white px-4 py-2 rounded-b-md flex justify-between items-center"
    >
      <p class="text-sm font-medium truncate">{{ product.translated.name }}</p>
      <UButton
        icon="i-lucide-shopping-cart"
        size="lg"
        @click="addToCart(product.id)"
      />
    </div>
  </div>
</template>
