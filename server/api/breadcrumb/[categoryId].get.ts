import type { components } from "~~/api-types/storeApiTypes";

const Id = /^[0-9a-f]{32}$/i;

/** Breadcrumb of a menu section (Category/Breadcrumb.vue). */
export default defineCachedEventHandler(
  async (event): Promise<components["schemas"]["BreadcrumbCollection"]> => {
    const categoryId = getRouterParam(event, "categoryId") ?? "";
    if (!Id.test(categoryId)) throw createError({ statusCode: 400 });

    const breadcrumb = await storeApiGet<
      components["schemas"]["BreadcrumbCollection"]
    >(`/breadcrumb/${categoryId}`, { query: { type: "category" } });
    // Shopware answers an unknown id with an empty list; a 404 is not
    // cached, so random ids cannot fill the cache.
    if (!breadcrumb?.length) throw createError({ statusCode: 404 });
    return breadcrumb;
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.category,
    name: "breadcrumb",
    getKey: (event) => `breadcrumb-${getRouterParam(event, "categoryId")}`,
  },
);
