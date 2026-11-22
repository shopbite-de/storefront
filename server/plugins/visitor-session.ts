import { sessionSettings, useVisitorSession } from "../utils/visitorSession";

/**
 * The storefront session (ADR 0001, step 4).
 *
 * Startup: the session's password is checked once; in production a
 * missing or short NUXT_VISITOR_SESSION_PASSWORD stops the server here
 * instead of ending every visitor's session with each restart. Not while
 * the build prerenders (images are built without the secret).
 *
 * Server-side rendering never reads the backend's state of the visitor
 * (the layer's context of steps 4 to 6 is gone, step 7).
 * `event.context.shopbiteHasVisitorSession` tells the app whether the
 * request brought a session (`app/plugins/visitor-has-session.server.ts`).
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
    // whether the request brought a session this server can unseal (a
    // malformed cookie or one of a dropped password is none): the app
    // starts one before the first write when not
    event.context.shopbiteHasVisitorSession = async () =>
      (await useVisitorSession(event).id()) !== null;
  });
});
