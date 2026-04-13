export default defineEventHandler(async (event) => {
  const body = await readBody<{
    newPassword: string;
    newPasswordConfirm: string;
    hash: string;
  }>(event);

  if (!body?.hash || !body?.newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "hash and newPassword required",
    });
  }

  await shopwareFetch(event, "/account/recovery-password-confirm", {
    method: "POST",
    body,
  });
});
