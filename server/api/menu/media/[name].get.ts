/**
 * The photos of the memory adapter's demo menu (`/api/menu/media/21.webp`);
 * 404 on every other backend, whose media have their own URLs.
 */
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name") ?? "";
  const number = /^(\d{1,4})\.webp$/.exec(name)?.[1];
  if (useRuntimeConfig(event).shopBite.backend !== "memory" || !number) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const { DEMO_IMAGES } = await import("../../../adapters/memory/demoImages");
  const image = DEMO_IMAGES[number];
  if (!image)
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  setResponseHeader(event, "Content-Type", "image/webp");
  setResponseHeader(event, "Cache-Control", "public, max-age=86400");
  return Buffer.from(image.data, "base64");
});
