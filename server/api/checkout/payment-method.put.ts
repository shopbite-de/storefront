export default defineEventHandler(async (event) => {
  const body = await readBody<{ id: string }>(event);

  if (!body?.id) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  await shopwareFetch(event, "/context", {
    method: "PATCH",
    body: { paymentMethodId: body.id },
  });
});
