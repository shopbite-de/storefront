import type { BreadcrumbItem } from "../../../shared/domain";
import { createResilientLoader } from "../../utils/backoff";
import { versionedKey } from "../../utils/cacheKeys";
import { answerDomain } from "../../utils/domainHttp";

// only real breadcrumbs are remembered, not the answers to random ids
const load = createResilientLoader<readonly BreadcrumbItem[]>(
  (crumbs) => crumbs.length > 0,
);

/**
 * The breadcrumb of a menu section (BreadcrumbItem[], Category/Breadcrumb.vue).
 * An unknown section is a 404, which is not cached, so random ids cannot
 * fill the cache.
 */
export default defineCachedEventHandler(
  async (event): Promise<readonly BreadcrumbItem[]> => {
    const sectionId = idParam(getRouterParam(event, "sectionId"), "sectionId");
    return answerDomain(() =>
      load(sectionId, () =>
        useBackend(event).navigation.getBreadcrumb(sectionId),
      ),
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.category,
    name: "breadcrumb",
    getKey: (event) =>
      versionedKey(
        `breadcrumb-${idParam(getRouterParam(event, "sectionId"), "sectionId")}`,
      ),
  },
);
