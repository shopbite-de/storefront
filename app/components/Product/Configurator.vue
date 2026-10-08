<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useProductConfigurator } from "~/composables/useProductConfigurator";

const props = defineProps<{
  p: Schemas["Product"];
  c: Schemas["PropertyGroup"][];
}>();

const { p, c } = toRefs(props);
const { product, changeVariant, configurator } = useProduct(p, c);
const { findVariantForSelectedOptions } = useProductConfigurator();
const { variants: selectableOptions } = useProductVariantsZwei(configurator);

const selectedOptions = ref<Record<string, string>>({});

// Presets show the options as a radio list, every option visible (#442).

const options = product.value.options as Schemas["PropertyGroupOption"][];
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
      changeVariant(foundVariant);
      emit("variant-switched", foundVariant);
    }
  },
  { deep: true },
);

const emit = defineEmits<{
  "variant-switched": [variant: Schemas["Product"]];
}>();
</script>
<template>
  <div class="flex flex-col gap-5">
    <SbChoiceGroup
      v-for="(variantGroup, propertyGroupId) in selectableOptions"
      :key="propertyGroupId"
      v-model="selectedOptions[propertyGroupId]"
      :legend="variantGroup.name"
      :options="variantGroup.options"
      required
    />
  </div>
</template>
