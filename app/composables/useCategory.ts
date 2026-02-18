import { encodeForQuery } from "@shopware/api-client/helpers";

export function useCategory(categoryId: Ref<string>) {
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

  const { data } = useAsyncData(cacheKey, async () => {
    const response = await apiClient.invoke(
      "readCategoryGet get /category/{navigationId}",
      {
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
