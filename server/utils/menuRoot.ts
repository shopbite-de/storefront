import { pickMenuRoot } from "../../app/utils/menuRoot";

/**
 * Server side of the menu root (#486, see app/utils/menuRoot.ts) for the
 * sitemap and llms.txt. The plugin value is kept for five minutes.
 */
const pluginMenuRoot = defineCachedFunction(
  async (): Promise<string | null> => {
    const { shopware } = useRuntimeConfig().public;
    const config = await $fetch<{ menuCategoryId?: string }>(
      `${shopware.endpoint}/shopbite/config`,
      { headers: { "sw-access-key": shopware.accessToken } },
    ).catch(() => null);
    return config?.menuCategoryId ?? null;
  },
  { maxAge: 300, name: "menu-root", getKey: () => "menu-root" },
);

export async function menuRootId(): Promise<string> {
  const configured = useRuntimeConfig().public.shopBite.menuCategoryId as
    string | undefined;
  return configured
    ? configured
    : pickMenuRoot(undefined, await pluginMenuRoot());
}
