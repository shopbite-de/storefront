export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiKey = config.geoapifyApiKey;
  const query = getQuery(event);

  if (!apiKey) {
    return { features: [] };
  }

  const { text, lang, limit, filter } = query;

  if (!text) {
    return { features: [] };
  }

  const geoapifyUrl = new URL(
    "https://api.geoapify.com/v1/geocode/autocomplete",
  );
  geoapifyUrl.searchParams.set("apiKey", apiKey);
  geoapifyUrl.searchParams.set("text", text as string);
  if (lang) geoapifyUrl.searchParams.set("lang", lang as string);
  if (limit) geoapifyUrl.searchParams.set("limit", limit as string);
  if (filter) geoapifyUrl.searchParams.set("filter", filter as string);

  try {
    return await $fetch(geoapifyUrl.toString());
  } catch (error) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.message || "Error fetching address suggestions",
    });
  }
});
