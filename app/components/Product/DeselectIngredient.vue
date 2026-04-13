<script setup lang="ts">
import type { Product, PropertyGroupOption } from "~/types/commerce/product";
import { toRefs, watch } from "vue";

const props = defineProps<{
  product: Product;
}>();
const { product } = toRefs(props);

const deselected = ref([]);

const list = computed(() => {
  const propsList = product.value?.properties ?? [];
  return propsList
    .filter(
      (propertyGroupOption: PropertyGroupOption) =>
        propertyGroupOption.group.name === "Hauptzutaten",
    )
    .map(
      (propertyGroupOption: PropertyGroupOption) =>
        propertyGroupOption.translated.name,
    );
});

watch(deselected, () => emit("ingredients-deselected", deselected.value), {
  deep: true,
});

const emit = defineEmits<{
  "ingredients-deselected": [deselected: string[]];
}>();
</script>

<template>
  <div v-if="list.length > 0" class="flex flex-row gap-2 my-6 items-center">
    <div class="basis-1/3">Aber ohne:</div>
    <USelect
      v-model="deselected"
      value-key="productId"
      :items="list"
      class="w-full"
      icon="i-lucide-minus"
      multiple
    />
  </div>
</template>
