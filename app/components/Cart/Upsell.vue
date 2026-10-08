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

// Presets: compact rows that fit the narrow order card (#443).
</script>

<template>
  <section
    v-if="products.length > 0"
    aria-labelledby="cart-upsell-title"
    class="flex flex-col gap-1 rounded-sb-card bg-sb-muted p-4 font-body text-sb-ink"
  >
    <h3
      id="cart-upsell-title"
      class="text-xs font-bold tracking-[0.14em] text-sb-accent uppercase"
    >
      Dazu passt
    </h3>
    <ul class="flex flex-col">
      <li
        v-for="product in products"
        :key="product.id"
        class="flex items-center gap-3 border-b border-sb-line py-2.5 last:border-0"
      >
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="font-semibold">{{ productName(product) }}</span>
          <span class="text-sm text-sb-ink-muted tabular-nums">{{
            getFormattedPrice(product.calculatedPrice.totalPrice)
          }}</span>
        </span>
        <SbIconButton
          variant="tint"
          :label="`${productName(product)} in den Warenkorb`"
          :disabled="!productIsAvailable(product) || isAdding(product.id)"
          @click="addUpsellProduct(product)"
        >
          <SbIcon name="plus" />
        </SbIconButton>
      </li>
    </ul>
  </section>
  <!-- Tinted box with offer cards, so the suggestions do not read as line items. -->
</template>
