import lruCacheDriver from "unstorage/drivers/lru-cache";

/**
 * Bounded storage for the Nitro cache (cached handlers and functions): an LRU
 * with at most `cacheStorage.maxEntries` entries and `maxSizeMb` of
 * serialised data (NUXT_CACHE_STORAGE_*). Without it the cache lives in the
 * root memory storage without any bound. The least recently used entries
 * are dropped first and are fetched again on their next request. A shop
 * that mounts its own cache storage (`nitro.storage.cache`, e.g. Redis)
 * keeps it; `maxEntries` 0 turns the LRU off.
 */
export default defineNitroPlugin(() => {
  const { maxEntries = 5000, maxSizeMb = 128 } =
    (
      useRuntimeConfig() as {
        cacheStorage?: { maxEntries?: number; maxSizeMb?: number };
      }
    ).cacheStorage ?? {};
  const max = Math.floor(Number(maxEntries));
  const maxSize = Math.floor(Number(maxSizeMb) * 1024 * 1024);
  if (!(max > 0) || !(maxSize > 0)) return;

  const storage = useStorage();
  // An unmounted `cache:` resolves to the root storage (base "").
  if (storage.getMount("cache:").base !== "") return;

  storage.mount("cache", lruCacheDriver({ max, maxSize }));
});
