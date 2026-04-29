export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; storefrontUrl?: string }>(event);

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: "email required" });
  }

  const { storeUrl } = useRuntimeConfig().public;

  await shopwareFetch(event, "/account/recovery-password", {
    method: "POST",
    body: { ...body, storefrontUrl: storeUrl },
  });
});
