import { queryCollection } from "@nuxt/content/server";

// The pages query Nuxt Content through these routes instead of
// `queryCollection()` in the browser: on client-side navigation the latter
// downloads the SQLite WASM build (865 KB) plus the collection dump (#314).
export default defineEventHandler(async (event) => {
  const page = await queryCollection(event, "home").first();

  if (!page) {
    throw createError({ statusCode: 404, statusMessage: "Page not found" });
  }

  return page;
});
