<script setup lang="ts">
import type { CartLine } from "../../../shared/domain";

interface Props {
  line?: CartLine | null;
  withQuantityInput?: boolean;
  withDeleteButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  line: null,
  withQuantityInput: true,
  withDeleteButton: true,
});

const { setQuantity, removeLine, isMutating } = useCartMutations();
const { getFormattedMoney } = useCommercePrice();

// Optimistic local quantity: the input reflects the customer's clicks
// immediately while the (queued, coalesced) request is in flight, and is
// re-synced from the cart once no mutation is running.
const localQuantity = ref(props.line?.quantity ?? 1);
watch([() => props.line?.quantity, isMutating], ([cartQuantity, mutating]) => {
  if (!mutating && cartQuantity !== undefined) {
    localQuantity.value = cartQuantity;
  }
});

const quantity = computed({
  get: () => localQuantity.value,
  set: (value: number) => {
    if (!props.line?.id) return;
    localQuantity.value = value;
    setQuantity(props.line.id, value);
  },
});

const formattedPrice = computed(() =>
  props.line?.totalPrice.amountMinor
    ? getFormattedMoney(props.line.totalPrice)
    : "",
);

const label = computed(() => (props.line ? cartLineLabel(props.line) : ""));

// Presets: stepper that turns into a remove button at 1 (#443).
const options = computed(() => props.line?.variant ?? []);

const handleRemoveItem = () => {
  if (!props.line) return;
  removeLine(props.line.id);
};
</script>

<template>
  <div class="cart-item font-body text-sb-ink">
    <div
      v-if="line"
      class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b border-sb-line py-4"
    >
      <h3 class="text-base font-bold">
        <span v-if="!withQuantityInput" class="tabular-nums"
          >{{ quantity }}×
        </span>
        {{ label }}
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
        :item-name="label || 'Artikel'"
        :max="100"
        :removable="withDeleteButton"
        @remove="handleRemoveItem"
      />
      <SbIconButton
        v-else-if="withDeleteButton"
        class="col-span-full justify-self-start"
        :label="`${label} entfernen`"
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
