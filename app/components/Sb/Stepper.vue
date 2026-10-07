<script setup lang="ts">
/**
 * Quantity stepper (#440). At the minimum the minus button turns into a
 * remove button when `removable` is set. `itemName` goes into the button
 * labels ("Pizza Mix, eine mehr"), the quantity is announced politely.
 */
const props = withDefaults(
  defineProps<{
    itemName: string;
    min?: number;
    max?: number;
    removable?: boolean;
    size?: "md" | "lg";
  }>(),
  { min: 1, max: 99, removable: false, size: "md" },
);

const emit = defineEmits<{ remove: [] }>();
const model = defineModel<number>({ required: true });

const atMin = computed(() => model.value <= props.min);
const showRemove = computed(() => props.removable && atMin.value);

function decrease() {
  if (showRemove.value) {
    emit("remove");
    return;
  }
  if (!atMin.value) model.value -= 1;
}

function increase() {
  if (model.value < props.max) model.value += 1;
}
</script>

<template>
  <div
    role="group"
    :aria-label="`Menge ${itemName}`"
    :class="[
      'inline-flex items-center rounded-sb-control bg-sb-muted font-body text-sb-ink',
      size === 'lg' ? 'h-14' : 'h-10',
    ]"
  >
    <button
      type="button"
      class="inline-flex h-full w-11 items-center justify-center rounded-sb-control focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus disabled:opacity-40"
      :aria-label="
        showRemove ? `${itemName} entfernen` : `${itemName}, eine weniger`
      "
      :disabled="atMin && !removable"
      @click="decrease"
    >
      <SbIcon :name="showRemove ? 'trash' : 'minus'" :size="16" />
    </button>
    <output
      class="min-w-5 text-center font-bold tabular-nums"
      aria-live="polite"
      >{{ model }}</output
    >
    <button
      type="button"
      class="inline-flex h-full w-11 items-center justify-center rounded-sb-control focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus disabled:opacity-40"
      :aria-label="`${itemName}, eine mehr`"
      :disabled="model >= max"
      @click="increase"
    >
      <SbIcon name="plus" :size="16" />
    </button>
  </div>
</template>
