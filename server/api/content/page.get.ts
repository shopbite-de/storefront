import { queryCollection } from "@nuxt/content/server";

// Landing page (content/*.md) by route path; see home.get.ts for why the
// pages do not query the collection in the browser (#314).
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);

  if (typeof path !== "string" || !path.startsWith("/") || path.length > 256) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }

  const page = await queryCollection(event, "landingpages").path(path).first();

  if (!page) {
    throw createError({
      statusCode: 404,
      statusMessage: `Page ${path} not found!`,
    });
  }

  return page;
});
