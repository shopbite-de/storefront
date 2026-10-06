import { queryCollection } from "@nuxt/content/server";

// Landing page (content/*.md) by route path, `page: null` if there is none;
// see home.get.ts for why the pages do not query the collection in the
// browser (#314).
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);

  if (typeof path !== "string" || !path.startsWith("/") || path.length > 256) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }

  // No content page is a regular answer, not an error: the catch-all asks
  // here first for every category page, and a 404 would show up as a failed
  // request in the browser console and the RUM data on each navigation.
  const page = await queryCollection(event, "landingpages").path(path).first();

  return { page: page ?? null };
});
