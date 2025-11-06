<script setup lang="ts">
import { useTrackEvent } from "#imports";
import { useProductSearch } from "@shopware/composables";
import type { Schemas } from "#shopware";


export type MarqueeItem = {
  productId: string
  image: string
}

const props = defineProps<MarqueeItem>()

const { productId, image } = toRefs(props)
const { search } = useProductSearch();

const productResponse = await search(productId.value);

// object that keeps a Product entity
const product: Schemas["Product"] = productResponse.product;

const CART_SUCCESS_TITLE = "Gute Wahl!";

const { refreshCart, addProduct } = useCart();
const toast = useToast();

const alt = computed(() => product.name + ' #' + product.productNumber)

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
  const newCart = await addProduct({
    id: productId,
    quantity: 1
  })
  await refreshCart(newCart)
  await showSuccessToast()
  useTrackEvent("add_to_cart", {
    props: {
      product_number: product.productNumber,
      quantity: 1,
    },
  });
}
</script>

<template>
  <div :id="product.id" class="relative inline-block">
    <NuxtImg :src="image" :alt="alt" height="300" class="rounded-lg shadow-2xl ring ring-default" />
    <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white px-4 py-2 rounded-b-md flex justify-between items-center">
      <p class="text-sm font-medium truncate">{{ product.translated.name }}</p>
      <UButton
        icon="i-lucide-shopping-cart"
        size="lg"
        @click="addToCart(product.id)"
      />
    </div>
  </div>
</template>

