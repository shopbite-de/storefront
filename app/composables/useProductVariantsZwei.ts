import { computed, type ComputedRef, type Ref } from "vue";
import type { Schemas } from "#shopware";

// Define the SelectItem interface to match what USelect expects
interface SelectItem {
  label: string;
  value: string;
  productId: string;
}

type VariantOptions = {
  name: string;
  options: SelectItem[];
};

type useProductVariantsReturn = {
  variants: ComputedRef<Record<string, VariantOptions>>;
};

// Accept configuratorSettings as a Ref of PropertyGroup[]
export function useProductVariantsZwei(
  configuratorSettings: Ref<Schemas["PropertyGroup"][]>,
): useProductVariantsReturn {
  const variants = computed(() => {
    const groups = configuratorSettings.value || [];
    const result: Record<string, VariantOptions> = {};

    for (const group of groups) {
      const groupId = group.id;
      const groupName = group.translated?.name || group.name;
      const options = group.options || [];

      if (!groupId || !groupName) continue;

      result[groupId] ??= {
        name: groupName,
        options: [],
      };

      for (const opt of options) {
        const optionId = opt.id;
        const optionName = opt.translated?.name || opt.name;
        if (!optionId || !optionName) continue;

        const exists = result[groupId].options.find(
          (o) => o.value === optionId,
        );
        if (!exists) {
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

  return { variants };
}
