export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, "id");
  const body = await readBody<{ paymentMethodId: string }>(event);

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }
  if (!body?.paymentMethodId) {
    throw createError({
      statusCode: 400,
      statusMessage: "paymentMethodId required",
    });
  }

  await shopwareFetch(event, "/order/payment", {
    method: "POST",
    body: { orderId, paymentMethodId: body.paymentMethodId },
  });
});
