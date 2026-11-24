<script setup lang="ts">
// One-click suggestions on the order confirmation step (#338): the upsell
// dishes that are not in the cart yet. Renders nothing once every
// suggestion is in the cart.
const { loadUpsellDishes, addUpsellDish, isAdding } = useCartUpsell();
const { lines } = useCartData();
const { getFormattedMoney } = useCommercePrice();
const { acceptsOrders } = useShopConfig();

// Browser only: the server renders without the cart, so filtering there would
// not match the hydrated page. The row follows once the request returns.
const { data: upsellDishes } = useAsyncData("cart-upsell", loadUpsellDishes, {
  server: false,
});

const dishes = computed(() =>
  (upsellDishes.value ?? []).filter(
    (dish) => !lines.value.some((line) => cartLineHoldsDish(line, dish.id)),
  ),
);

// Presets: compact rows that fit the narrow order card (#443).
</script>

<template>
  <section
    v-if="acceptsOrders && dishes.length > 0"
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
        v-for="dish in dishes"
        :key="dish.id"
        class="flex items-center gap-3 border-b border-sb-line py-2.5 last:border-0"
      >
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="font-semibold">{{ dish.name }}</span>
          <span class="text-sm text-sb-ink-muted tabular-nums">{{
            getFormattedMoney(dish.price)
          }}</span>
        </span>
        <SbIconButton
          variant="tint"
          :label="`${dish.name} in den Warenkorb`"
          :disabled="!dish.available || isAdding(dish.id)"
          @click="addUpsellDish(dish)"
        >
          <SbIcon name="plus" />
        </SbIconButton>
      </li>
    </ul>
  </section>
  <!-- Tinted box with offer cards, so the suggestions do not read as line items. -->
</template>
