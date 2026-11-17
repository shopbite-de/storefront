import type { components } from "~~/api-types/storeApiTypes";
type Schemas = components["schemas"];

// What the header, footer and menu navigation read (useNavigation).
const NAVIGATION_CRITERIA = {
  includes: {
    category: [
      "id",
      "name",
      "translated",
      "seoUrl",
      "customFields",
      "children",
      "linkNewTab",
    ],
  },
};

// The menu sections of the home page with their photo (useHomeMenuCategories).
const HOME_CRITERIA = {
  depth: 1,
  includes: {
    category: ["id", "name", "translated", "seoUrl", "customFields", "media"],
    media: ["url", "thumbnails", "metaData"],
    media_thumbnail: ["url", "width"],
  },
};

const NAVIGATIONS = {
  main: { activeId: "main-navigation", root: "main-navigation" },
  footer: { activeId: "footer-navigation", root: "footer-navigation" },
  menu: { activeId: "main-navigation", root: "menu" },
  home: { activeId: "main-navigation", root: "menu" },
} as const;

type NavigationType = keyof typeof NAVIGATIONS;

function navigationOf(type: string | undefined) {
  if (!type || !Object.hasOwn(NAVIGATIONS, type)) return null;
  return NAVIGATIONS[type as NavigationType];
}

async function rootIdOf(type: string | undefined): Promise<string> {
  const navigation = navigationOf(type);
  if (!navigation) return "";
  return navigation.root === "menu" ? await menuRootId() : navigation.root;
}

/**
 * The navigations every page renders: `main` (header), `footer`, `menu` (the
 * menu sections below the menu root, #486) and `home` (the sections with
 * their photo). Shared by all visitors, so the server keeps them instead of
 * asking Shopware on each request; the key carries the menu root, which the
 * plugin configuration may change.
 */
export default defineCachedEventHandler(
  async (event): Promise<Schemas["Category"][]> => {
    const type = getRouterParam(event, "type");
    const navigation = navigationOf(type);
    if (!navigation) throw createError({ statusCode: 404 });

    return await storeApiPost(
      `/navigation/${navigation.activeId}/${await rootIdOf(type)}`,
      type === "home" ? HOME_CRITERIA : NAVIGATION_CRITERIA,
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.navigation,
    name: "navigation",
    getKey: async (event) => {
      const type = getRouterParam(event, "type");
      return `navigation-${type}-${await rootIdOf(type)}`;
    },
  },
);
