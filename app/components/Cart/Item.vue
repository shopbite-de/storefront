<script setup lang="ts">
import type { Schemas } from "#shopware";

interface Props {
  cartItem?: Schemas["LineItem"] | null;
  withQuantityInput?: boolean;
  withDeleteButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  cartItem: null,
  withQuantityInput: true,
  withDeleteButton: true,
});

const { removeItem, changeProductQuantity } = useCart();
const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});

// Use computed for reactive quantity with proper null checks
const quantity = computed({
  get: () => props.cartItem?.quantity ?? 1,
  set: async (value: number) => {
    if (!props.cartItem?.id) return;

    await changeProductQuantity({
      id: props.cartItem.id,
      quantity: value,
    });
  },
});

const formattedPrice = computed(() => {
  return props.cartItem?.price?.totalPrice
    ? getFormattedPrice(props.cartItem.price.totalPrice)
    : "";
});

const handleRemoveItem = () => {
  if (!props.cartItem) return;
  removeItem(props.cartItem);
};
</script>

<template>
  <div class="cart-item">
    <div v-if="cartItem" class="flex flex-col gap-4">
      <!-- Main content row -->
      <div class="flex flex-row justify-between items-center gap-4">
        <!-- Left section: Title and variations -->
        <div class="flex flex-row items-center gap-4 flex-1 min-w-0">
          <div class="flex-1 min-w-0">
            <h3 class="text-md">
              <span v-if="!withQuantityInput" class="mr-2">
                {{ quantity }}x
              </span>
              <span class="font-semibold">{{ cartItem.label }}</span>
            </h3>

            <p
              v-for="option in cartItem?.payload?.options"
              :key="option.group + option.option"
              class="text-sm text-pretty text-toned mt-1"
            >
              {{ option.group }}: {{ option.option }}
            </p>
          </div>
        </div>

        <!-- Right section: Price -->
        <div class="font-medium whitespace-nowrap">
          {{ formattedPrice }}
        </div>
      </div>

      <!-- Quantity input and delete button row -->
      <div v-if="withQuantityInput" class="flex flex-row items-center gap-2">
        <UInputNumber
          v-model="quantity"
          :min="1"
          :max="100"
          class="max-w-46"
          aria-label="Item quantity"
        />
        <UButton
          v-if="withDeleteButton"
          icon="i-lucide-trash"
          variant="soft"
          color="neutral"
          aria-label="Remove item from cart"
          @click="handleRemoveItem"
        />
      </div>
      <!-- Delete button alone if no quantity input -->
      <UButton
        v-else-if="withDeleteButton"
        icon="i-lucide-trash"
        variant="outline"
        color="error"
        aria-label="Remove item from cart"
        @click="handleRemoveItem"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-4">
      <p class="text-toned">Warenkorb ist leer...</p>
    </div>
  </div>
</template>
