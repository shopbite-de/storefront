<script setup lang="ts">
import type {
  Product,
  PropertyGroup,
  PropertyGroupOption,
} from "~/types/commerce/product";
import { useProductConfigurator } from "~/composables/useProductConfigurator";

const props = defineProps<{
  p: Product;
  c: PropertyGroup[];
}>();

const { p, c } = toRefs(props);
const { findVariantForSelectedOptions } = useProductConfigurator(p);
const { variants: selectableOptions } = useProductVariantsZwei(c);

const selectedOptions = ref<Record<string, string>>({});

const options = p.value.options as PropertyGroupOption[];
for (const option of options ?? []) {
  if (option.group && option.id) {
    selectedOptions.value[option.group.id] = option.id;
  }
}

watch(
  selectedOptions.value,
  async () => {
    const foundVariant = await findVariantForSelectedOptions(
      selectedOptions.value,
    );

    if (foundVariant) {
      emit("variant-switched", foundVariant);
    }
  },
  { deep: true },
);

const emit = defineEmits<{
  "variant-switched": [variant: Product];
}>();
</script>
<template>
  <div
    v-for="(variantGroup, propertyGroupId) in selectableOptions"
    :key="propertyGroupId"
    class="my-6"
  >
    <div class="flex flex-row gap-2 items-center">
      <div class="basis-1/3">{{ variantGroup.name }}:</div>
      <USelect
        v-model="selectedOptions[propertyGroupId]"
        value-key="productId"
        :items="variantGroup.options"
        class="w-full"
        icon="i-lucide-square-stack"
      />
    </div>
  </div>
</template>
