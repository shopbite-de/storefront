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

const { setQuantity, removeLineItem, isMutating } = useCartMutations();
const { getFormattedPrice } = useCommercePrice();

// Optimistic local quantity: the input reflects the customer's clicks
// immediately while the (queued, coalesced) request is in flight, and is
// re-synced from the cart once no mutation is running.
const localQuantity = ref(props.cartItem?.quantity ?? 1);
watch(
  [() => props.cartItem?.quantity, isMutating],
  ([cartQuantity, mutating]) => {
    if (!mutating && cartQuantity !== undefined) {
      localQuantity.value = cartQuantity;
    }
  },
);

const quantity = computed({
  get: () => localQuantity.value,
  set: (value: number) => {
    if (!props.cartItem?.id) return;
    localQuantity.value = value;
    setQuantity(props.cartItem.id, value);
  },
});

const formattedPrice = computed(() => {
  return props.cartItem?.price?.totalPrice
    ? getFormattedPrice(props.cartItem.price.totalPrice)
    : "";
});

// Presets: stepper that turns into a remove button at 1 (#443).
const options = computed(
  () =>
    ((props.cartItem?.type === "container"
      ? props.cartItem?.children?.[0]?.payload?.options
      : props.cartItem?.payload?.options) ?? []) as {
      group: string;
      option: string;
    }[],
);

const handleRemoveItem = () => {
  if (!props.cartItem) return;
  removeLineItem(props.cartItem);
};
</script>

<template>
  <div class="cart-item font-body text-sb-ink">
    <div
      v-if="cartItem"
      class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b border-sb-line py-4"
    >
      <h3 class="text-base font-bold">
        <span v-if="!withQuantityInput" class="tabular-nums"
          >{{ quantity }}×
        </span>
        {{ cartItem.label }}
      </h3>
      <span class="font-semibold tabular-nums">{{ formattedPrice }}</span>
      <p
        v-for="option in options"
        :key="option.group + option.option"
        class="col-span-full text-sm text-sb-ink-muted"
      >
        {{ option.group }}: {{ option.option }}
      </p>
      <SbStepper
        v-if="withQuantityInput"
        v-model="quantity"
        class="col-span-full justify-self-start"
        :item-name="cartItem.label ?? 'Artikel'"
        :max="100"
        :removable="withDeleteButton"
        @remove="handleRemoveItem"
      />
      <SbIconButton
        v-else-if="withDeleteButton"
        class="col-span-full justify-self-start"
        :label="`${cartItem.label} entfernen`"
        :disabled="isMutating"
        @click="handleRemoveItem"
      >
        <SbIcon name="trash" />
      </SbIconButton>
    </div>
    <p v-else class="py-4 text-center text-sb-ink-muted">
      Der Warenkorb ist leer.
    </p>
  </div>
</template>
