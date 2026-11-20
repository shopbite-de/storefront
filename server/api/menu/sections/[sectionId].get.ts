import { askCatalog } from "../../../utils/catalogData";

/**
 * A menu section (MenuSection): the section header, its SEO data, the
 * sub-sections its dishes are grouped by. 404 for an unknown section.
 */
export default defineCachedEventHandler(
  async (event) => {
    const sectionId = idParam(getRouterParam(event, "sectionId"), "sectionId");
    return askCatalog(event, (catalog) => catalog.getSection(sectionId));
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.category,
    name: "menu-section",
    getKey: (event) =>
      `section-${idParam(getRouterParam(event, "sectionId"), "sectionId")}`,
  },
);
