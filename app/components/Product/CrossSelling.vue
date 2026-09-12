<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";

const props = defineProps<{
  product: Schemas["Product"];
}>();

const emit = defineEmits<{
  "extras-selected": [selectedExtras: AssociationItemProduct[]];
}>();

const selectedExtras = ref<AssociationItemProduct[]>([]);

const { associationItems, isAssociationsLoading } = useProductCrossSelling(
  () => props.product.id,
);

const isSelected = (extra: AssociationItemProduct) =>
  selectedExtras.value.some((selected) => selected.value === extra.value);

function toggle(extra: AssociationItemProduct) {
  selectedExtras.value = isSelected(extra)
    ? selectedExtras.value.filter((selected) => selected.value !== extra.value)
    : [...selectedExtras.value, extra];
}

watch(selectedExtras, () => emit("extras-selected", selectedExtras.value));
</script>

<template>
  <div v-if="isAssociationsLoading" class="flex flex-wrap gap-2">
    <USkeleton class="h-10 w-32 rounded-full" />
    <USkeleton class="h-10 w-28 rounded-full" />
  </div>
  <div
    v-for="association in associationItems"
    v-else
    :key="association.label"
    class="flex flex-col gap-2"
  >
    <div class="flex items-baseline justify-between">
      <span class="font-semibold text-highlighted">{{
        association.label
      }}</span>
      <span class="text-xs text-muted">optional</span>
    </div>
    <div
      class="flex flex-wrap gap-2"
      role="group"
      :aria-label="association.label"
    >
      <UButton
        v-for="extra in association.products"
        :key="extra.value"
        size="lg"
        class="rounded-full"
        :color="isSelected(extra) ? 'primary' : 'neutral'"
        :variant="isSelected(extra) ? 'subtle' : 'outline'"
        :icon="isSelected(extra) ? 'i-lucide-check' : 'i-lucide-plus'"
        :aria-pressed="isSelected(extra)"
        @click="toggle(extra)"
      >
        {{ extra.label }}
        <span class="font-normal opacity-80">+{{ extra.price }}</span>
      </UButton>
    </div>
  </div>
</template>
