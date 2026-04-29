export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: "email required" });
  }

  return await shopwareFetch(event, "/contact-form", {
    method: "POST",
    body,
  });
});
