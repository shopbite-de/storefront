export default defineEventHandler(async (event) => {
  await shopwareFetch(event, "/account/customer", { method: "DELETE" });
});
