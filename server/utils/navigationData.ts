import { defineBackendData } from "./shopData";

/**
 * The menu root (`NavigationPort.getMenuRootId`) for the cached menu
 * navigations, `/api/menu/root` and the menu root page: cached like the
 * restaurant operations (`config` TTL, `swr: false`), the last good root
 * during an outage, no guess without one (the Shopware adapter reads the
 * plugin configuration, so a root is never older than its TTL).
 */
export const menuRootData = defineBackendData(
  "menu-root",
  useRuntimeConfig().public.shopBite.cacheTtl.config,
  (backend) => backend.navigation.getMenuRootId(),
);
