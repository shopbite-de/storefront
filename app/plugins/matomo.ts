// Registers Matomo (incl. page view tracking) on every page, but only when it
// is configured. Replaces the unconditional @nuxt/scripts registry entry (#294).
//
// The registry composable is imported after `onNuxtReady`, so its code (and
// the script it injects) stays off the critical path of the first paint
// (#314). Page views are pushed here: the registry's own watcher would only
// hook `page:finish`, which has already fired for the first page.
export default defineNuxtPlugin({
  name: "shopbite:matomo",
  setup(nuxtApp) {
    if (import.meta.server || !useMatomoConfig().enabled) return;

    onNuxtReady(async () => {
      const { useMatomo } = await import("~/composables/useMatomo");

      await nuxtApp.runWithContext(() => {
        if (!useMatomo()) return;

        const route = useRoute();
        const { trackPageView } = useTrackEvent();
        let lastPath = route.fullPath;
        trackPageView(lastPath);

        nuxtApp.hook("page:finish", async () => {
          const path = route.fullPath;
          if (path === lastPath) return;
          lastPath = path;
          // The title is applied to the DOM in the next animation frame.
          await nextTick();
          requestAnimationFrame(() => trackPageView(path));
        });
      });
    });
  },
});
