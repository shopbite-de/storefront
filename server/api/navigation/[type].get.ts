import type { components } from "~~/api-types/storeApiTypes";
import { createResilientLoader } from "../../utils/backoff";
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

const load = createResilientLoader<Schemas["Category"][]>();

function navigationOf(type: string | undefined) {
  if (!type || !Object.hasOwn(NAVIGATIONS, type)) return null;
  return NAVIGATIONS[type as NavigationType];
}

type RootContext = { context?: Record<string, unknown> };

/**
 * The root of a navigation, resolved once per request (key and request
 * share `event.context`): the plugin config may expire in between, and a
 * second answer would cache one root's sections under the other's key.
 */
async function rootIdOf(
  event: RootContext,
  type: string | undefined,
): Promise<string> {
  const context = (event.context ??= {});
  if (typeof context.navigationRoot === "string") return context.navigationRoot;
  const navigation = navigationOf(type);
  if (!navigation) return "";
  const root =
    navigation.root === "menu" ? await menuRootIdStrict() : navigation.root;
  context.navigationRoot = root;
  return root;
}

/**
 * The navigations every page renders: `main` (header), `footer`, `menu` (the
 * menu sections below the menu root, #486) and `home` (the sections with
 * their photo). Shared by all visitors, so the server keeps them instead of
 * asking Shopware on each request; the key carries the menu root, which the
 * plugin configuration may change. Without the plugin configuration the
 * request fails rather than caching a menu of the fallback root.
 */
export default defineCachedEventHandler(
  async (event): Promise<Schemas["Category"][]> => {
    const type = getRouterParam(event, "type");
    const navigation = navigationOf(type);
    if (!navigation) throw createError({ statusCode: 404 });

    const root = await rootIdOf(event, type);
    return await load(`${type}-${root}`, () =>
      storeApiPost(
        `/navigation/${navigation.activeId}/${root}`,
        type === "home" ? HOME_CRITERIA : NAVIGATION_CRITERIA,
      ),
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.navigation,
    name: "navigation",
    getKey: async (event) => {
      const type = getRouterParam(event, "type");
      return `navigation-${type}-${await rootIdOf(event, type)}`;
    },
  },
);
