export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string; password: string }>(event);

  if (!body?.username || !body?.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "username and password required",
    });
  }

  // Login — shopwareFetch automatically writes the new sw-context-token cookie.
  // The composable calls refreshUser() after this to hydrate the user state.
  await shopwareFetch(event, "/account/login", {
    method: "POST",
    body: { username: body.username, password: body.password },
  });
});
