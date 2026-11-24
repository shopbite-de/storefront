import { defineNuxtPlugin } from "#app";
import { shopI18n } from "./shop";

/** `$t` in templates (ADR 0002); `useI18n()` and `<i18n-t>` are auto-imported. */
export default defineNuxtPlugin({
  name: "shopbite:i18n",
  enforce: "pre",
  setup(nuxtApp) {
    nuxtApp.vueApp.config.globalProperties.$t = shopI18n.t;
  },
});
