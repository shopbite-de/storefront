<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    cartItem?: Schemas["LineItem"] | null;
    withQuantityInput?: boolean;
    withDeleteButton?: boolean;
  }>(),
  {
    cartItem: null,
    withQuantityInput: true,
    withDeleteButton: true,
  },
);

const { cartItem } = toRefs(props);

const { changeProductQuantity, removeItem } = useCart();

const quantity = ref(cartItem.value.quantity);

const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});

watch(quantity, async () => {
  await changeProductQuantity({
    id: cartItem.value.id,
    quantity: quantity.value,
  });
});
</script>

<template>
  <div>
    <div v-if="cartItem" class="flex flex-col gap-4">
      <div class="flex flex-row justify-between items-center gap-4">
        <div class="flex flex-row items-center gap-4">
          <UButton
            v-if="withDeleteButton"
            icon="i-lucide-trash"
            variant="soft"
            color="neutral"
            @click="removeItem(cartItem)"
          />
          <h3 class="text-md">
            <span v-if="!withQuantityInput" class="mr-2">{{ quantity }}x</span>
            <span class="font-semibold">{{ cartItem.label }}</span>
          </h3>
        </div>
        <div>
          {{ getFormattedPrice(cartItem.price.totalPrice) }}
        </div>
      </div>
      <UInputNumber
        v-if="withQuantityInput"
        v-model="quantity"
        :min="1"
        :max="100"
        class="max-w-46"
      />
    </div>
    <div v-else>
      <p>Warenkorb ist leer...</p>
    </div>
  </div>
</template>
