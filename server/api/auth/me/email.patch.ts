export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string;
    emailConfirmation: string;
    password: string;
  }>(event);

  if (!body?.email || !body?.emailConfirmation) {
    throw createError({
      statusCode: 400,
      statusMessage: "email and emailConfirmation required",
    });
  }

  await shopwareFetch(event, "/account/change-email", {
    method: "POST",
    body: {
      email: body.email,
      emailConfirmation: body.emailConfirmation,
      password: body.password,
    },
  });
});
