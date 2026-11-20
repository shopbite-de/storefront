import type { NitroFetchRequest } from "nitropack";
import type { MenuSection } from "../../shared/domain";

/**
 * A menu section from the BFF (`/api/menu/sections/[sectionId]`): header,
 * SEO data and the sub-sections the listing groups its dishes by.
 */
export async function useMenuSection(sectionId: Ref<string>) {
  const { data: section } = await useFetch<MenuSection>(
    `/api/menu/sections/${sectionId.value}` as NitroFetchRequest,
  );

  return { section };
}
