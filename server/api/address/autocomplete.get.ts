/**
 * Geoapify address autocomplete proxy: keeps the API key on the server.
 * Only `text` (3–200 characters), `lang` (two letters) and `limit` (1–10) are
 * passed on; the area filter comes from the runtime config
 * (`public.shopBite.addressAutocomplete.boundingBox`). Identical lookups are
 * answered from a small in-memory cache for 5 minutes, and lookups that reach
 * Geoapify are rate limited per client IP (`addressAutocomplete.rateLimit`,
 * capacity 0 = off). Upstream errors are logged with the key redacted and
 * answered with a generic 502.
 */
import type { AutocompleteParams } from "../../utils/addressAutocomplete";

const GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

type Suggestions = ReturnType<typeof pickAddressFields>;

const cache = createTtlCache<Suggestions>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: CACHE_MAX_ENTRIES,
});
let limiter: ReturnType<typeof createTokenBucketLimiter> | null | undefined;

function rateLimiter() {
  if (limiter !== undefined) return limiter;
  const { capacity = 20, refillPerMinute = 20 } =
    useRuntimeConfig().addressAutocomplete?.rateLimit ?? {};
  limiter =
    Number(capacity) > 0
      ? createTokenBucketLimiter({
          capacity: Number(capacity),
          refillPerMinute: Number(refillPerMinute),
        })
      : null;
  return limiter;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiKey = config.geoapifyApiKey;

  if (!apiKey) {
    return { features: [] };
  }

  let params: AutocompleteParams | null;
  try {
    params = parseAutocompleteQuery(getQuery(event));
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Bad Request" });
  }
  if (!params) {
    return { features: [] };
  }

  const filter = boundingBoxFilter(
    config.public.shopBite.addressAutocomplete?.boundingBox,
  );
  const key = JSON.stringify([params.text, params.lang, params.limit, filter]);
  const cached = cache.get(key);
  if (cached) return cached;

  const limit = rateLimiter();
  if (
    limit &&
    !limit.take(getRequestIP(event, { xForwardedFor: true }) ?? "")
  ) {
    setResponseHeader(event, "Retry-After", 10);
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
    });
  }

  const url = new URL(GEOAPIFY_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("text", params.text);
  url.searchParams.set("lang", params.lang);
  url.searchParams.set("limit", String(params.limit));
  if (filter) url.searchParams.set("filter", filter);

  try {
    const suggestions = pickAddressFields(await $fetch(url.toString()));
    cache.set(key, suggestions);
    return suggestions;
  } catch (error) {
    const err = error as { response?: { status?: number }; message?: string };
    console.error("Address autocomplete request failed", {
      status: err.response?.status,
      url: redactApiKey(url.toString()),
      message: redactApiKey(String(err.message ?? "")),
    });
    throw createError({
      statusCode: 502,
      statusMessage: "Address suggestions unavailable",
    });
  }
});
