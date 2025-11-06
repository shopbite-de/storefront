<script setup lang="ts">
const { cart, shippingTotal, isEmpty } = useCart();

withDefaults(
  defineProps<{
    withQuantityInput?: boolean;
    withDeleteButton?: boolean;
    withToCartButton?: boolean;
  }>(),
  {
    withQuantityInput: true,
    withDeleteButton: true,
    withToCartButton: false,
  },
);

const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});
const emit = defineEmits(["go-to-cart"]);
</script>

<template>
  <div class="flex flex-col gap-4 h-full justify-between">
    <div class="flex flex-col gap-4">
      <CartItem
        v-for="lineItem in cart?.lineItems ?? []"
        :key="lineItem.id"
        :cart-item="lineItem"
        :with-quantity-input="withQuantityInput"
        :with-delete-button="withDeleteButton"
      />
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex flex-row justify-between">
        <div>Versandkosten:</div>
        <div>{{ getFormattedPrice(shippingTotal) }}</div>
      </div>
      <div class="flex flex-row justify-between font-bold">
        <div>Summe:</div>
        <div>{{ getFormattedPrice(cart?.price.totalPrice) }}</div>
      </div>
      <UButton
        v-if="withToCartButton"
        :disabled="isEmpty"
        block
        size="lg"
        label="Bestellung aufgeben"
        to="/bestellung"
        @click="emit('go-to-cart')"
      />
    </div>
  </div>
</template>
