export default defineEventHandler(async (event) => {
  const body = await readBody<{ firstName: string; lastName: string }>(event);

  if (!body?.firstName || !body?.lastName) {
    throw createError({
      statusCode: 400,
      statusMessage: "firstName and lastName required",
    });
  }

  await shopwareFetch(event, "/account/change-profile", {
    method: "POST",
    body: { firstName: body.firstName, lastName: body.lastName },
  });
});
