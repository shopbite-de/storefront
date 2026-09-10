import type { components } from "~~/api-types/storeApiTypes";

type Schemas = components["schemas"];

const NAVIGATION_CRITERIA = {
  depth: 10,
  // flat list: in a tree, children would be dropped by the includes below
  buildTree: false,
  includes: {
    category: ["seoUrl", "type", "updatedAt", "createdAt", "media"],
    media: ["url"],
  },
  associations: {
    media: {},
  },
};

/**
 * Dynamic sitemap source: categories of the main navigation and the menu
 * category tree. Products follow once they have their own pages (#289).
 */
export default defineSitemapEventHandler(async () => {
  const { shopware, shopBite } = useRuntimeConfig().public;
  const rootIds = new Set([
    "main-navigation",
    shopBite.menuCategoryId || "main-navigation",
  ]);

  const trees = await Promise.all(
    [...rootIds].map((rootId) =>
      $fetch<Schemas["Category"][]>(
        `${shopware.endpoint}/navigation/main-navigation/${rootId}`,
        {
          method: "POST",
          headers: {
            "sw-access-key": shopware.accessToken,
            "sw-include-seo-urls": "true",
          },
          body: NAVIGATION_CRITERIA,
        },
      ),
    ),
  );

  return [
    ...(shopBite.feature.contactForm ? ["/kontakt"] : []),
    ...categoriesToSitemapUrls(trees.flat()),
  ];
});
