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

function initialOptions(variant: Ref<Schemas["Product"]>) {
  const options = variant.value.options as Schemas["PropertyGroupOption"][];
  for (const option of options) {
    if (option.group && option.id) {
      selectedOptions.value[option.group.id] = option.id;
    }
  }
}
onMounted(() => {
  initialOptions(product);
});

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
