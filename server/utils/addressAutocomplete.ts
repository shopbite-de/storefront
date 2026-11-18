/**
 * Input rules, rate limit and cache of the Geoapify proxy
 * (`server/api/address/autocomplete.get.ts`).
 */

/** The checkout asks from three characters on (`useAddressAutocomplete`). */
export const AUTOCOMPLETE_MIN_TEXT = 3;
export const AUTOCOMPLETE_MAX_TEXT = 200;
export const AUTOCOMPLETE_MAX_LIMIT = 10;
const DEFAULT_LIMIT = 5;
const DEFAULT_LANG = "de";

export interface AutocompleteParams {
  text: string;
  lang: string;
  limit: number;
}

export class AutocompleteInputError extends Error {}

function single(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new AutocompleteInputError("Invalid parameter");
  }
  return String(value);
}

/**
 * The allowed query parameters (`text`, `lang`, `limit`); everything else is
 * ignored. Returns null for a text too short to look up and throws
 * `AutocompleteInputError` for invalid values.
 */
export function parseAutocompleteQuery(
  query: Record<string, unknown>,
): AutocompleteParams | null {
  const text = single(query.text)?.trim() ?? "";
  if (text.length > AUTOCOMPLETE_MAX_TEXT) {
    throw new AutocompleteInputError("Text too long");
  }

  const lang = single(query.lang) ?? DEFAULT_LANG;
  if (!/^[a-z]{2}$/.test(lang)) {
    throw new AutocompleteInputError("Invalid language");
  }

  const rawLimit = single(query.limit) ?? String(DEFAULT_LIMIT);
  if (!/^\d{1,2}$/.test(rawLimit)) {
    throw new AutocompleteInputError("Invalid limit");
  }
  const limit = Number(rawLimit);
  if (limit < 1 || limit > AUTOCOMPLETE_MAX_LIMIT) {
    throw new AutocompleteInputError("Invalid limit");
  }

  if (text.length < AUTOCOMPLETE_MIN_TEXT) return null;
  return { text, lang, limit };
}

/**
 * The Geoapify `filter` from the configured bounding box
 * ("lon1,lat1,lon2,lat2"), or undefined when it is empty or malformed.
 */
export function boundingBoxFilter(boundingBox: unknown): string | undefined {
  if (typeof boundingBox !== "string") return undefined;
  const parts = boundingBox.split(",").map((part) => part.trim());
  if (parts.length !== 4) return undefined;
  if (!parts.every((part) => /^-?\d{1,3}(\.\d+)?$/.test(part))) {
    return undefined;
  }
  return `rect:${parts.join(",")}`;
}

/** Hides the API key in a URL or in an error message containing one. */
export function redactApiKey(text: string): string {
  return text.replace(/([?&]apiKey=)[^&\s"']*/gi, "$1***");
}

interface GeoapifyFeature {
  properties?: Record<string, unknown>;
}

const ADDRESS_FIELDS = [
  "street",
  "housenumber",
  "name",
  "city",
  "town",
  "village",
  "postcode",
  "formatted",
] as const;

/** Keeps only the address fields the checkout reads. */
export function pickAddressFields(response: unknown): {
  features: { properties: Record<string, unknown> }[];
} {
  const features = (response as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return { features: [] };
  return {
    features: (features as GeoapifyFeature[]).map((feature) => {
      const properties: Record<string, unknown> = {};
      for (const field of ADDRESS_FIELDS) {
        const value = feature?.properties?.[field];
        if (typeof value === "string" || typeof value === "number") {
          properties[field] = value;
        }
      }
      return { properties };
    }),
  };
}

/**
 * In-memory token bucket per key (client IP): `capacity` requests at once,
 * refilled by `refillPerMinute`. Holds at most `maxKeys` buckets; when full,
 * the least recently used bucket is dropped.
 */
export function createTokenBucketLimiter(options: {
  capacity: number;
  refillPerMinute: number;
  maxKeys?: number;
  now?: () => number;
}) {
  const { capacity, refillPerMinute, maxKeys = 10_000 } = options;
  const now = options.now ?? (() => Date.now());
  const perMs = refillPerMinute / 60_000;
  const buckets = new Map<string, { tokens: number; at: number }>();

  return {
    /** Takes a token for `key`; false when the bucket is empty. */
    take(key: string): boolean {
      const time = now();
      const bucket = buckets.get(key);
      let tokens = capacity;
      if (bucket) {
        tokens = Math.min(capacity, bucket.tokens + (time - bucket.at) * perMs);
        buckets.delete(key);
      } else if (buckets.size >= maxKeys) {
        const oldest = buckets.keys().next().value;
        if (oldest !== undefined) buckets.delete(oldest);
      }
      const allowed = tokens >= 1;
      buckets.set(key, { tokens: allowed ? tokens - 1 : tokens, at: time });
      return allowed;
    },
    size: () => buckets.size,
  };
}

/** A small in-memory cache with a TTL and at most `maxEntries` entries. */
export function createTtlCache<T>(options: {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}) {
  const { ttlMs, maxEntries } = options;
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, { value: T; expires: number }>();

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expires <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T) {
      entries.delete(key);
      while (entries.size >= maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      entries.set(key, { value, expires: now() + ttlMs });
    },
  };
}
