/**
 * Matomo script, or `null` if Matomo is not configured.
 *
 * Without `matomoUrl` the @nuxt/scripts registry falls back to
 * `https://cdn.matomo.cloud/<cloudId>/matomo.js` and requests
 * `https://cdn.matomo.cloud/undefined/matomo.js` on every page (#294), so the
 * script must only be created with a complete config. The values come from
 * `runtimeConfig.public.scripts.matomoAnalytics` (NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_*),
 * which the registry merges in itself (#259).
 *
 * Only `plugins/matomo.ts` imports this composable, dynamically after
 * `onNuxtReady`, so the registry code stays out of the entry chunk (#314).
 * Page views are tracked by the plugin (`watch: false`): the registry's
 * own page watcher hooks `page:finish`, which has already fired for the
 * first page by then. Tracking calls go through `useTrackEvent`, which
 * writes to the `_paq` queue directly.
 */
export function useMatomo() {
  if (!useMatomoConfig().enabled) return null;

  return useScriptMatomoAnalytics({
    watch: false,
    scriptOptions: { trigger: "onNuxtReady" },
  });
}
