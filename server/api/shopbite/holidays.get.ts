export default defineEventHandler(async (event) => {
  const response = await shopwareFetch<{ holidays: unknown[] }>(
    event,
    "/shopbite/holiday",
  );
  return response.holidays ?? [];
});
