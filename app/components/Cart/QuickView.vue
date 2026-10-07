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

const { hasPreset } = useThemePreset();
</script>

<template>
  <div
    v-if="hasPreset"
    class="flex h-full flex-col justify-between gap-5 font-body text-sb-ink"
  >
    <div v-if="isEmpty" class="flex flex-col items-start gap-3 py-2">
      <p class="text-sb-ink-muted">Der Warenkorb ist noch leer.</p>
      <SbButton variant="secondary" to="/" @click="emit('go-to-cart')"
        >Zur Speisekarte</SbButton
      >
    </div>
    <div v-else class="flex flex-col">
      <CartItem
        v-for="lineItem in cart?.lineItems ?? []"
        :key="lineItem.id"
        :cart-item="lineItem"
        :with-quantity-input="withQuantityInput"
        :with-delete-button="withDeleteButton"
      />
    </div>
    <div v-if="!isEmpty" class="flex flex-col gap-3">
      <LazyCartUpsell v-if="withUpsell" />
      <dl class="flex flex-col gap-2 text-[15px] tabular-nums">
        <div class="flex justify-between text-sb-ink-muted">
          <dt>Lieferung</dt>
          <dd
            :class="
              shippingTotal === 0 ? 'font-semibold text-sb-primary-ink' : ''
            "
          >
            {{
              shippingTotal === 0
                ? "kostenlos"
                : getFormattedPrice(shippingTotal)
            }}
          </dd>
        </div>
        <div
          class="flex justify-between border-t border-sb-line pt-2.5 text-lg font-bold"
        >
          <dt>Gesamt</dt>
          <dd>{{ getFormattedPrice(cart?.price.totalPrice) }}</dd>
        </div>
      </dl>
      <SbButton
        v-if="withToCartButton"
        block
        size="lg"
        to="/bestellung/kasse"
        @click="emit('go-to-cart')"
      >
        Zur Kasse
        <template #trailing><SbIcon name="chevron-right" /></template>
      </SbButton>
    </div>
  </div>
  <div v-else class="flex flex-col gap-4 h-full justify-between">
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
      <!-- Suggestions right above the total, on the confirmation step only (#338). -->
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
