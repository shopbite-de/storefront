<script setup lang="ts">
import type { Variant, VariantGroup } from "../../../shared/domain";

/**
 * The variant groups of a dish ("Größe", "Beilage") as required choices
 * (#442, every option visible). A changed choice asks the BFF for the
 * variant with these options and emits it.
 */
const props = defineProps<{
  dishId: string;
  groups: readonly VariantGroup[];
  /** The options of the variant the sheet starts with. */
  selectedOptionIds: readonly string[];
}>();

const emit = defineEmits<{
  "variant-switched": [variant: Variant];
}>();

const selectedOptions = ref<Record<string, string>>({});
for (const group of props.groups) {
  const option = group.options.find((candidate) =>
    props.selectedOptionIds.includes(candidate.id),
  );
  if (option) selectedOptions.value[group.id] = option.id;
}

const choices = computed(() =>
  props.groups.map((group) => ({
    id: group.id,
    name: group.name,
    options: group.options.map((option) => ({
      label: option.name,
      value: option.id,
    })),
  })),
);

async function findVariant(optionIds: string[]): Promise<Variant | null> {
  try {
    return await $fetch<Variant | null>(
      `/api/menu/dishes/${props.dishId}/variant`,
      { query: { options: optionIds.join("|") } },
    );
  } catch (error) {
    console.error("[ProductConfigurator] variant not found", error);
    return null;
  }
}

watch(
  selectedOptions.value,
  async () => {
    const variant = await findVariant(Object.values(selectedOptions.value));
    if (variant) emit("variant-switched", variant);
  },
  { deep: true },
);
</script>

<template>
  <div class="flex flex-col gap-5">
    <SbChoiceGroup
      v-for="group in choices"
      :key="group.id"
      v-model="selectedOptions[group.id]"
      :legend="group.name"
      :options="group.options"
      required
    />
  </div>
</template>
