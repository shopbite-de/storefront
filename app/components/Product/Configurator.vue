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
const { hasPreset } = useThemePreset();

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
  <div v-if="hasPreset" class="flex flex-col gap-5">
    <SbChoiceGroup
      v-for="(variantGroup, propertyGroupId) in selectableOptions"
      :key="propertyGroupId"
      v-model="selectedOptions[propertyGroupId]"
      :legend="variantGroup.name"
      :options="variantGroup.options"
      required
    />
  </div>
  <div v-else class="flex flex-col gap-5">
    <div
      v-for="(variantGroup, propertyGroupId) in selectableOptions"
      :key="propertyGroupId"
      class="flex flex-col gap-2"
    >
      <span class="font-semibold text-highlighted">{{
        variantGroup.name
      }}</span>
      <USelect
        v-model="selectedOptions[propertyGroupId]"
        value-key="productId"
        :items="variantGroup.options"
        size="lg"
        class="w-full"
        icon="i-lucide-square-stack"
        :aria-label="variantGroup.name"
      />
    </div>
  </div>
</template>
