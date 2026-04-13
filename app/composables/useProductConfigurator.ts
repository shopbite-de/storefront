import type { Product } from "~/types/commerce/product";

export function useProductConfigurator(
  product?: Ref<{ parentId?: string | null; id?: string | null } | null>,
) {
  const parentProductId = computed(
    () => product?.value?.parentId ?? product?.value?.id,
  );

  async function findVariantForSelectedOptions(options: {
    [code: string]: string;
  }): Promise<Product | undefined> {
    if (!parentProductId.value) return undefined;
    try {
      const result = await $fetch<Product | null>("/api/product/variant", {
        query: {
          parentId: parentProductId.value,
          optionIds: Object.values(options),
        },
      });
      return result ?? undefined;
    } catch (e) {
      console.error("useProductConfigurator:findVariantForSelectedOptions", e);
      return undefined;
    }
  }

  return { findVariantForSelectedOptions };
}
