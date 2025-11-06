import { computed } from "vue";
import type { Schemas } from "#shopware";

// Define the SelectItem interface to match what USelect expects
interface SelectItem {
  label: string;
  value: string;
  productId: string;
}

type VariantOptions = {
  name: string;
  options: SelectItem[]; // Changed to match USelect's expected format
};

type useProductVariantsReturn = {
  variants: ComputedRef<Record<string, VariantOptions>>;
};

export function useProductVariants(
  configuratorSettings: Ref<Schemas["ProductConfiguratorSetting"][]>,
): useProductVariantsReturn {
  const variants = computed(() => {
    const configSettings = configuratorSettings.value || [];
    const result: Record<string, VariantOptions> = {};

    for (const option of configSettings) {
      const groupId = option.option?.group?.id;
      const groupName =
        option.option?.group?.translated?.name || option.option?.group?.name;
      const optionName = option.option?.translated?.name || option.option?.name;
      const optionId = option.option?.id;

      if (groupId && groupName && optionName && optionId) {
        result[groupId] ??= {
          name: groupName,
          options: [],
        };

        // Check if option already exists to avoid duplicates
        const existingOption = result[groupId].options.find(
          (item) => item.value === optionId,
        );
        if (!existingOption) {
          // Add option in the format USelect expects
          result[groupId].options.push({
            label: optionName,
            value: optionId,
            productId: optionId,
          });
        }
      }
    }

    return result;
  });

  return {
    variants,
  };
}
