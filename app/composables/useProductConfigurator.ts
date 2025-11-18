import { computed, ref } from "vue";
import type { Schemas } from "#shopware";
import {
  useShopwareContext,
  useProductConfigurator as useProductConfiguratorOriginal,
  useProduct,
} from "@shopware/composables";
import { getTranslatedProperty } from "@shopware/helpers";

export function useProductConfigurator() {
  const { apiClient } = useShopwareContext();

  const original = useProductConfiguratorOriginal();

  const { configurator, product } = useProduct();

  const selected = ref<{
    [key: string]: string;
  }>({});
  const isLoadingOptions = ref(!!product.value.options?.length);
  const parentProductId = computed(() => product.value?.parentId);
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
    const filter: Schemas["Filters"] = [
      {
        type: "equals",
        field: "parentId",
        value: parentProductId.value as string,
      },
      ...Object.values(options || selected.value).map(
        (id) =>
          ({
            type: "equals",
            field: "optionIds",
            value: id,
          }) as Schemas["EqualsFilter"],
      ),
    ];
    try {
      const response = await apiClient.invoke("readProduct post /product", {
        body: {
          filter,
          limit: 1,
          includes: {
            product: [
              "id",
              "name",
              "translated",
              "productNumber",
              "options",
              "properties",
            ],
            product_option: ["id", "groupId", "name", "translated", "group"],
            property: ["id", "name", "translated", "options"],
            property_group_option: ["id", "name", "translated", "group"],
          },
          associations: {
            options: {
              associations: {
                group: {},
              },
            },
            properties: {
              associations: {
                group: {},
              },
            },
          },
        },
      });
      return response.data.elements?.[0]; // return first matching product
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
