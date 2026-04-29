export default defineEventHandler(async (event) => {
  // Shopware returns a new anonymous context token on logout,
  // which shopwareFetch writes back as a cookie automatically.
  await shopwareFetch(event, "/account/logout", { method: "POST" });
});
