import { computed, ref } from "vue";
import type { Schemas } from "#shopware";
import {
  useProductConfigurator as useProductConfiguratorOriginal,
  useProduct,
} from "@shopware/composables";
import { getTranslatedProperty } from "@shopware/helpers";

export function useProductConfigurator() {
  const original = useProductConfiguratorOriginal();

  const { configurator, product } = useProduct();

  const selected = ref<{
    [key: string]: string;
  }>({});
  const isLoadingOptions = ref(!!product.value.options?.length);
  const parentProductId = computed(
    () => product.value?.parentId ?? product.value?.id,
  );
  const getOptionGroups = computed<Schemas["PropertyGroup"][]>(() => {
    return configurator.value || [];
  });

  const findGroupCodeForOption = (optionId: string) => {
    const group = getOptionGroups.value.find((optionGroup) => {
      const optionFound = optionGroup.options?.find((option) => {
        return option.id === optionId;
      });
      return !!optionFound;
    });

    return getTranslatedProperty(group, "name");
  };

  // create a group -> optionId map
  for (const optionId of product.value.optionIds || []) {
    const optionGroupCode = findGroupCodeForOption(optionId);
    if (optionGroupCode) {
      selected.value[optionGroupCode] = optionId;
    }
  }

  async function findVariantForSelectedOptions(options?: {
    [code: string]: string;
  }): Promise<Schemas["Product"] | undefined> {
    if (!parentProductId.value) return undefined;
    try {
      const result = await $fetch<Schemas["Product"] | null>(
        "/api/product/variant",
        {
          query: {
            parentId: parentProductId.value,
            optionIds: Object.values(options || selected.value),
          },
        },
      );
      return result ?? undefined;
    } catch (e) {
      console.error("SwProductDetails:findVariantForSelectedOptions", e);
      return undefined;
    }
  }

  return {
    ...original,
    findVariantForSelectedOptions,
    isLoadingOptions,
  };
}
