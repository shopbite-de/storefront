import type { Schemas } from "#shopware";
import type { NitroFetchRequest } from "nitropack";

export async function useCategoryById(categoryId: Ref<string>) {
  const { data: category } = await useFetch<Schemas["Category"]>(
    `/api/category/${categoryId.value}` as NitroFetchRequest,
  );

  return { category };
}
