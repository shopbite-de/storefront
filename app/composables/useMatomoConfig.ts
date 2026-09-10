/**
 * Matomo settings from `runtimeConfig.public.scripts.matomoAnalytics`
 * (NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_*). `enabled` is only true with a
 * complete configuration (#294). Kept apart from `useMatomo` so callers that
 * only need the flag do not import the @nuxt/scripts registry (#314).
 */
export function useMatomoConfig() {
  const { matomoUrl, siteId } =
    useRuntimeConfig().public.scripts.matomoAnalytics;

  return { matomoUrl, siteId, enabled: Boolean(matomoUrl && siteId) };
}
