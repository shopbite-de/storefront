/**
 * Matomo script, or `null` if Matomo is not configured.
 *
 * Without `matomoUrl` the @nuxt/scripts registry falls back to
 * `https://cdn.matomo.cloud/<cloudId>/matomo.js` and requests
 * `https://cdn.matomo.cloud/undefined/matomo.js` on every page (#294), so the
 * script must only be created with a complete config. The values come from
 * `runtimeConfig.public.scripts.matomoAnalytics` (NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_*),
 * which the registry merges in itself (#259).
 */
export function useMatomo() {
  const { matomoUrl, siteId } =
    useRuntimeConfig().public.scripts.matomoAnalytics;

  if (!matomoUrl || !siteId) return null;

  return useScriptMatomoAnalytics({
    scriptOptions: { trigger: "onNuxtReady" },
  });
}
