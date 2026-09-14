<script setup lang="ts">
const { cart, shippingTotal, isEmpty } = useCart();

withDefaults(
  defineProps<{
    withQuantityInput?: boolean;
    withDeleteButton?: boolean;
    withToCartButton?: boolean;
    withUpsell?: boolean;
  }>(),
  {
    withQuantityInput: true,
    withDeleteButton: true,
    withToCartButton: false,
    withUpsell: false,
  },
);

const { getFormattedPrice } = useCommercePrice();
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
      <!-- Suggestions right above the total, in the drawer only (#338). -->
      <LazyCartUpsell v-if="withUpsell && !isEmpty" />
      <div class="flex flex-row justify-between">
        <template v-if="shippingTotal === 0">
          <div class="text-success font-medium">
            Versandkostenfreie Lieferung
          </div>
        </template>
        <template v-else>
          <div>Versandkosten:</div>
          <div>{{ getFormattedPrice(shippingTotal) }}</div>
        </template>
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
