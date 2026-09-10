// Registers Matomo (incl. page view tracking) on every page, but only when it
// is configured. Replaces the unconditional @nuxt/scripts registry entry (#294).
export default defineNuxtPlugin({
  name: "shopbite:matomo",
  setup() {
    useMatomo();
  },
});
