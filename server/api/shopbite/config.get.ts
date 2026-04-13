export default defineEventHandler(async (event) => {
  return await shopwareFetch<{
    deliveryTime?: number;
    isCheckoutEnabled?: boolean;
  }>(event, "/shopbite/config");
});
