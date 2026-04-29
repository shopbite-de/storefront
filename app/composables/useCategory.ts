import type { Category } from "~/types/commerce/category";
import type { NitroFetchRequest } from "nitropack";

export async function useCategory(categoryId: Ref<string>) {
  const { data: category } = await useFetch<Category>(
    `/api/category/${categoryId.value}` as NitroFetchRequest,
  );

  return { category };
}
