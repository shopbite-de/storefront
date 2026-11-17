import type { components } from "~~/api-types/storeApiTypes";
import { createResilientLoader } from "../../utils/backoff";

const Id = /^[0-9a-f]{32}$/i;
type Breadcrumb = components["schemas"]["BreadcrumbCollection"];

// only real breadcrumbs are remembered, not the empty list of random ids
const load = createResilientLoader<Breadcrumb>((crumbs) => crumbs.length > 0);

/** Breadcrumb of a menu section (Category/Breadcrumb.vue). */
export default defineCachedEventHandler(
  async (event): Promise<components["schemas"]["BreadcrumbCollection"]> => {
    const categoryId = getRouterParam(event, "categoryId") ?? "";
    if (!Id.test(categoryId)) throw createError({ statusCode: 400 });

    const breadcrumb = await load(categoryId, () =>
      storeApiGet<Breadcrumb>(`/breadcrumb/${categoryId}`, {
        query: { type: "category" },
      }),
    );
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
