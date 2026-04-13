export default defineEventHandler(async (event) => {
  const body = await readBody<{ em: string; hash: string }>(event);

  if (!body?.em || !body?.hash) {
    throw createError({
      statusCode: 400,
      statusMessage: "em and hash required",
    });
  }

  await shopwareFetch(event, "/account/register-confirm", {
    method: "POST",
    body: { em: body.em, hash: body.hash },
  });
});
