import type { components } from "~~/api-types/storeApiTypes";

const Id = /^[0-9a-f]{32}$/i;

/** Breadcrumb of a menu section (Category/Breadcrumb.vue). */
export default defineCachedEventHandler(
  async (event): Promise<components["schemas"]["BreadcrumbCollection"]> => {
    const categoryId = getRouterParam(event, "categoryId") ?? "";
    if (!Id.test(categoryId)) throw createError({ statusCode: 400 });

    return await storeApiGet(`/breadcrumb/${categoryId}`, {
      query: { type: "category" },
    });
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.category,
    name: "breadcrumb",
    getKey: (event) => `breadcrumb-${getRouterParam(event, "categoryId")}`,
  },
);
