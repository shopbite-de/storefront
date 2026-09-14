<script setup lang="ts">
import type { Schemas } from "#shopware";

// One-click suggestions in the cart drawer (#338): flagged products that are
// not in the cart yet. Renders nothing once every suggestion is in the cart.
const { loadUpsellProducts, addUpsellProduct, isAdding } = useCartUpsell();
const { cartItems } = useCart();
const { getFormattedPrice } = useCommercePrice();

// Not awaited: the drawer shows the line items right away, the row follows.
const { data: upsellProducts } = useAsyncData(
  "cart-upsell",
  loadUpsellProducts,
);

const products = computed(() =>
  (upsellProducts.value ?? []).filter(
    (product) =>
      !cartItems.value.some((item) => lineItemHoldsProduct(item, product.id)),
  ),
);

const productName = (product: Schemas["Product"]) =>
  product.translated?.name ?? product.name;
</script>

<template>
  <section
    v-if="products.length > 0"
    aria-labelledby="cart-upsell-title"
    class="flex flex-col gap-2"
  >
    <h3 id="cart-upsell-title" class="font-bold text-highlighted">
      Dazu passt
    </h3>
    <ul
      class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
    >
      <li
        v-for="product in products"
        :key="product.id"
        class="flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-lg bg-default ring ring-default"
      >
        <!-- Decorative: the name is right below. -->
        <img
          v-if="product.cover?.media?.url"
          :src="product.cover.media.url"
          :srcset="mediaSrcSet(product.cover.media)"
          sizes="144px"
          alt=""
          loading="lazy"
          decoding="async"
          class="h-20 w-full object-cover"
        />
        <div
          v-else
          class="flex h-20 w-full items-center justify-center bg-gradient-to-b from-brand-100 to-brand-200 text-brand-600"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-utensils-crossed" class="size-6" />
        </div>
        <div class="flex flex-1 flex-col gap-1 p-2">
          <span class="text-xs font-semibold text-primary">
            #{{ product.productNumber }}
          </span>
          <span
            class="line-clamp-2 text-sm leading-4 font-semibold text-highlighted"
          >
            {{ productName(product) }}
          </span>
          <div class="mt-auto flex items-center justify-between gap-2 pt-1">
            <span class="text-sm font-bold text-highlighted">
              {{ getFormattedPrice(product.calculatedPrice.totalPrice) }}
            </span>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              variant="soft"
              class="rounded-full"
              :aria-label="`${productName(product)} in den Warenkorb`"
              :loading="isAdding(product.id)"
              :disabled="!productIsAvailable(product) || isAdding(product.id)"
              @click="addUpsellProduct(product)"
            />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
