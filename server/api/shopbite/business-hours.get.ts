export default defineEventHandler(async (event) => {
  const response = await shopwareFetch<{ businessHours: unknown[] }>(
    event,
    "/shopbite/business-hour",
  );
  return response.businessHours ?? [];
});
