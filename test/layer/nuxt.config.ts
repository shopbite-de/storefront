// A minimal shop that extends the storefront like the real shops do (La
// Fattoria, quickstart, lead demos). CI builds it to catch imports that only
// resolve inside the storefront itself, e.g. the `#shared` alias, which in a
// layer points to the shop's shared/ folder (2.0.1).
export default defineNuxtConfig({
  extends: ["../.."],
  shopBite: { preset: "grill" },
});
