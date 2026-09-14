<script setup lang="ts">
import type { Schemas } from "#shopware";

// One-click suggestions on the order confirmation step (#338): flagged
// products that are not in the cart yet. Renders nothing once every
// suggestion is in the cart.
const { loadUpsellProducts, addUpsellProduct, isAdding } = useCartUpsell();
const { cartItems } = useCart();
const { getFormattedPrice } = useCommercePrice();

// Browser only: the server renders without the cart, so filtering there would
// not match the hydrated page. The row follows once the request returns.
const { data: upsellProducts } = useAsyncData(
  "cart-upsell",
  loadUpsellProducts,
  { server: false },
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
  <!-- Tinted box with offer cards, so the suggestions do not read as line items. -->
  <section
    v-if="products.length > 0"
    aria-labelledby="cart-upsell-title"
    class="flex flex-col gap-3 rounded-lg bg-primary/5 p-3 ring ring-primary/20"
  >
    <div>
      <h3
        id="cart-upsell-title"
        class="flex items-center gap-1.5 font-bold text-highlighted"
      >
        <UIcon name="i-lucide-sparkles" class="size-4 text-primary" />
        Dazu passt
      </h3>
      <p class="text-sm text-muted">
        Mit einem Klick zur Bestellung hinzufügen.
      </p>
    </div>
    <!-- One suggestion spans the full width; with more the next one peeks in. -->
    <ul
      class="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:thin]"
    >
      <li
        v-for="product in products"
        :key="product.id"
        class="flex shrink-0 snap-start overflow-hidden rounded-lg bg-default shadow-sm ring ring-default"
        :class="products.length > 1 ? 'w-[85%]' : 'w-full'"
      >
        <!-- Decorative: the name is right next to it. -->
        <img
          v-if="product.cover?.media?.url"
          :src="product.cover.media.url"
          :srcset="mediaSrcSet(product.cover.media)"
          sizes="(min-width: 40rem) 144px, 112px"
          alt=""
          loading="lazy"
          decoding="async"
          class="size-28 shrink-0 object-cover sm:size-36"
        />
        <div
          v-else
          class="flex size-28 shrink-0 items-center justify-center bg-gradient-to-b from-brand-100 to-brand-200 text-brand-600 sm:size-36"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-utensils-crossed" class="size-8" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5 p-3">
          <span class="text-xs font-semibold text-primary">
            #{{ product.productNumber }}
          </span>
          <span
            class="line-clamp-2 text-sm font-semibold text-highlighted sm:text-base"
          >
            {{ productName(product) }}
          </span>
          <div class="mt-auto flex items-center justify-between gap-2 pt-1">
            <span class="font-bold text-highlighted">
              {{ getFormattedPrice(product.calculatedPrice.totalPrice) }}
            </span>
            <UButton
              icon="i-lucide-plus"
              variant="subtle"
              class="shrink-0"
              :aria-label="`${productName(product)} in den Warenkorb`"
              :loading="isAdding(product.id)"
              :disabled="!productIsAvailable(product) || isAdding(product.id)"
              @click="addUpsellProduct(product)"
            >
              <span class="hidden sm:inline">Hinzufügen</span>
            </UButton>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
