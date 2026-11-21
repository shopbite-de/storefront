import { backendSession, sessionSettings } from "../utils/visitorSession";

/**
 * The storefront session (ADR 0001, step 4).
 *
 * Startup: the session's password is checked once; in production a
 * missing or short NUXT_VISITOR_SESSION_PASSWORD stops the server here
 * instead of ending every visitor's session with each restart. Not while
 * the build prerenders (images are built without the secret).
 *
 * Server-side rendering: the Shopware layer renders with the visitor's
 * context token (`useUserContextInSSR`); `app/plugins/store-api-session.ts`
 * reads it through `event.context.shopbiteStoreApiSession`, which takes over
 * the old `sw-context-token` cookie first. Read only: rendering never
 * creates or replaces a session (bots, and a cookie set while the HTML
 * streams). Nothing is read unless a page renders.
 */
export default defineNitroPlugin((nitroApp) => {
  // the build prerenders pages without visitors (and without the secret)
  if (!import.meta.prerender) {
    try {
      sessionSettings();
    } catch (error) {
      // the reason in one line, not the bundle's stack
      console.error(`[session] ${(error as Error).message}`);
      process.exit(1);
    }
  }

  nitroApp.hooks.hook("request", (event) => {
    event.context.shopbiteStoreApiSession = {
      read: async () =>
        (await backendSession(event, "shopware", { create: false })).read(),
    };
  });
});
