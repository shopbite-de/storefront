// Raw Shopware context passthrough — used by app.vue to initialize the
// Shopware composables layer (useSessionContext, usePrice) during migration.
export default defineEventHandler(async (event) => {
  return await shopwareFetch(event, "/context");
});
