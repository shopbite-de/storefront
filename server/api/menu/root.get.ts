/**
 * The id of the menu's root section (`useMenuRootId`), so the browser does
 * not ask the backend for it. Strict: when the plugin configuration cannot
 * be loaded it fails instead of answering the fallback root, so the
 * browser does not keep a wrong root for the visit. Moves behind
 * NavigationPort in step 3.
 */
export default defineEventHandler(async () => ({
  id: await menuRootIdStrict(),
}));
