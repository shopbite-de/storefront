import lruCacheDriver from "unstorage/drivers/lru-cache";
import {
  backendSession,
  SESSION_STORAGE,
  sessionSettings,
} from "../utils/visitorSession";

/**
 * The storefront session (ADR 0001, step 4).
 *
 * Storage: unless the shop mounts its own `nitro.storage["shopbite-session"]`
 * (e.g. Redis for several instances, or to keep sessions over a restart),
 * an LRU in memory with at most `visitorSession.maxEntries` sessions, each
 * `maxAgeDays` after the last visit (NUXT_VISITOR_SESSION_*).
 *
 * Server-side rendering: the Shopware layer renders with the visitor's
 * context token (`useUserContextInSSR`); `app/plugins/store-api-session.ts`
 * reads it through `event.context.shopbiteStoreApiSession`, which takes over
 * the old `sw-context-token` cookie first. Read only: rendering never
 * creates or replaces a session (bots, and a cookie set while the HTML
 * streams). Nothing is read unless a page renders.
 */
export default defineNitroPlugin((nitroApp) => {
  const storage = useStorage();
  // an unmounted path resolves to the root storage (base "")
  if (storage.getMount(`${SESSION_STORAGE}:`).base === "") {
    const { maxEntries, maxAgeSeconds } = sessionSettings();
    storage.mount(
      SESSION_STORAGE,
      lruCacheDriver({ max: maxEntries, ttl: maxAgeSeconds * 1000 }),
    );
  }

  nitroApp.hooks.hook("request", (event) => {
    event.context.shopbiteStoreApiSession = {
      read: async () =>
        (await backendSession(event, "shopware", { create: false })).read(),
    };
  });
});
