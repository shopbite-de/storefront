import { z } from "zod";

const Id = z.string().regex(/^[0-9a-f]{32}$/i);
const Body = z
  .object({
    products: z.array(Id).max(1000).optional(),
    categories: z.array(Id).max(1000).optional(),
  })
  .default({});

/**
 * Empties the Store API caches after the backoffice changed the menu (#484).
 * Protected by NUXT_CACHE_PURGE_SECRET; without the variable the route is
 * off. An empty body purges everything.
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig(event).cachePurgeSecret;
  if (!secret) throw createError({ statusCode: 404 });
  if (!hasPurgeSecret(getHeader(event, "authorization"), secret)) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const raw = await readBody(event).catch(() => undefined);
  const parsed = Body.safeParse(raw ?? {});
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid body" });

  const storage = useStorage();
  const keys = keysToPurge(await storage.getKeys("cache:nitro"), parsed.data);
  await Promise.all(keys.map((key) => storage.removeItem(key)));
  return { purged: keys.length };
});
