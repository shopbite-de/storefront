import { encodeForQuery } from "@shopware/api-client/helpers";

export async function useCategory(categoryId: Ref<string>) {
  const { apiClient } = useShopwareContext();

  const criteria = encodeForQuery({
    includes: {
      category: [
        "name",
        "translated",
        "seoUrl",
        "externalLink",
        "customFields",
      ],
    },
  });

  const cacheKey = computed(() => `category-${categoryId.value}`);

  const { data } = await useAsyncData(cacheKey, async () => {
    const response = await apiClient.invoke(
      "readCategoryGet get /category/{navigationId}",
      {
        // @ts-expect-error: _criteria is not in the type definition
        query: { _criteria: criteria },
        pathParams: {
          navigationId: categoryId.value,
        },
      },
    );

    return response.data;
  });

  return {
    category: data,
  };
}
