import { pickMenuRoot } from "../../app/utils/menuRoot";
import { shopBiteConfig } from "./shopBiteConfig";

/**
 * Server side of the menu root (#486, see app/utils/menuRoot.ts). The plugin
 * value comes from the cached plugin configuration (shopBiteConfig).
 */
function configuredRoot(): string | undefined {
  return (
    (useRuntimeConfig().public.shopBite.menuCategoryId as string | undefined) ||
    undefined
  );
}

/** For the sitemap and llms.txt: falls back to the navigation root. */
export async function menuRootId(): Promise<string> {
  const configured = configuredRoot();
  if (configured) return configured;
  const config = await shopBiteConfig().catch(() => null);
  return pickMenuRoot(undefined, config?.menuCategoryId);
}

/**
 * For cached navigations: rejects when the plugin configuration cannot be
 * loaded, so a menu built on the fallback root is never cached.
 */
export async function menuRootIdStrict(): Promise<string> {
  const configured = configuredRoot();
  if (configured) return configured;
  return pickMenuRoot(undefined, (await shopBiteConfig()).menuCategoryId);
}
