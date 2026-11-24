<script setup lang="ts">
const { lines, discounts, shippingCosts, total, isEmpty } = useCartData();

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

const { getFormattedMoney } = useCommercePrice();
const freeShipping = computed(() => !shippingCosts.value?.amountMinor);
const emit = defineEmits(["go-to-cart"]);
</script>

<template>
  <div class="flex h-full flex-col justify-between gap-5 font-body text-sb-ink">
    <div v-if="isEmpty" class="flex flex-col items-start gap-3 py-2">
      <p class="text-sb-ink-muted">{{ $t("order.quickView.empty") }}</p>
      <SbButton variant="secondary" to="/" @click="emit('go-to-cart')">{{
        $t("order.shared.toMenu")
      }}</SbButton>
    </div>
    <div v-else class="flex flex-col">
      <CartItem
        v-for="line in lines"
        :key="line.id"
        :line="line"
        :with-quantity-input="withQuantityInput"
        :with-delete-button="withDeleteButton"
      />
    </div>
    <div v-if="!isEmpty" class="flex flex-col gap-3">
      <LazyCartUpsell v-if="withUpsell" />
      <dl class="flex flex-col gap-2 text-[15px] tabular-nums">
        <div
          v-for="discount in discounts"
          :key="discount.code ?? discount.name"
          class="flex justify-between text-sb-ink-muted"
        >
          <dt>{{ discount.name }}</dt>
          <dd>{{ getFormattedMoney(discount.amount) }}</dd>
        </div>
        <div class="flex justify-between text-sb-ink-muted">
          <dt>{{ $t("order.quickView.shipping") }}</dt>
          <dd :class="freeShipping ? 'font-semibold text-sb-primary-ink' : ''">
            {{
              freeShipping
                ? $t("order.quickView.free")
                : getFormattedMoney(shippingCosts)
            }}
          </dd>
        </div>
        <div
          class="flex justify-between border-t border-sb-line pt-2.5 text-lg font-bold"
        >
          <dt>{{ $t("order.shared.total") }}</dt>
          <dd>{{ getFormattedMoney(total) }}</dd>
        </div>
      </dl>
      <SbButton
        v-if="withToCartButton"
        block
        size="lg"
        :to="{ name: 'bestellung-kasse' }"
        @click="emit('go-to-cart')"
      >
        {{ $t("order.quickView.toCheckout") }}
        <template #trailing><SbIcon name="chevron-right" /></template>
      </SbButton>
    </div>
  </div>
</template>
