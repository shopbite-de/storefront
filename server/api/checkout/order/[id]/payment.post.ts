export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, "id");
  const body = await readBody<{ successUrl: string; errorUrl: string }>(event);

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }
  if (!body?.successUrl || !body?.errorUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "successUrl and errorUrl required",
    });
  }

  // Shopware returns { redirectUrl } when an external payment page is needed,
  // or an empty body for synchronous payment methods.
  const result = await shopwareFetch<{ redirectUrl?: string }>(
    event,
    "/handle-payment",
    {
      method: "POST",
      body: {
        orderId,
        finishUrl: body.successUrl,
        errorUrl: body.errorUrl,
      },
    },
  );

  return { redirectUrl: result?.redirectUrl ?? null };
});
