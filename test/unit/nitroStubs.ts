import { vi } from "vitest";

/**
 * Nitro's auto-imports as globals, so server route files can be imported in
 * the Node test project: the cache wrappers return the handler/function and
 * their options instead of caching.
 */
export interface CachedHandler {
  handler: (event: TestEvent) => Promise<unknown>;
  opts: {
    name: string;
    maxAge: number;
    swr?: boolean;
    getKey: (event: TestEvent) => string | Promise<string>;
  };
}

export interface CachedFunction<A extends unknown[], R> {
  (...args: A): Promise<R>;
  opts: {
    name: string;
    maxAge: number;
    swr?: boolean;
    getKey: (...args: A) => string;
    validate?: (entry: { value?: unknown }) => boolean;
  };
}

export interface TestEvent {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export const CACHE_TTL = {
  product: 86400,
  crossSelling: 86400,
  listing: 86400,
  variant: 3600,
  category: 86400,
  navigation: 86400,
  seoUrl: 600,
  paymentMethods: 3600,
  config: 60,
  businessHours: 300,
  holidays: 300,
};

export function stubNitro(globals: Record<string, unknown> = {}) {
  const stubs: Record<string, unknown> = {
    defineCachedEventHandler: (
      handler: CachedHandler["handler"],
      opts: CachedHandler["opts"],
    ) => ({ handler, opts }),
    // Like Nitro: stores what `validate` accepts (default: not undefined)
    // under `getKey`, for `maxAge` seconds; a thrown error is not stored.
    defineCachedFunction: vi.fn(
      (
        fn: (...args: unknown[]) => Promise<unknown>,
        opts: CachedFunction<unknown[], unknown>["opts"],
      ) => {
        const store = new Map<string, { value: unknown; mtime: number }>();
        const cached = async (...args: unknown[]) => {
          const key = opts.getKey ? opts.getKey(...args) : "";
          const hit = store.get(key);
          if (hit && Date.now() - hit.mtime <= (opts.maxAge ?? 0) * 1000) {
            return hit.value;
          }
          const value = await fn(...args);
          const entry = { value, mtime: Date.now() };
          const valid = opts.validate
            ? opts.validate(entry) !== false
            : value !== undefined;
          if (valid) store.set(key, entry);
          return value;
        };
        return Object.assign(cached, { opts, store });
      },
    ),
    defineEventHandler: (handler: unknown) => handler,
    useRuntimeConfig: () => ({
      public: {
        shopBite: { cacheTtl: CACHE_TTL, menuCategoryId: "" },
      },
      shopware: { endpoint: "http://shopware/store-api", accessToken: "k" },
    }),
    createError: (input: {
      statusCode: number;
      statusMessage?: string;
      data?: unknown;
    }) =>
      Object.assign(new Error(input.statusMessage ?? `${input.statusCode}`), {
        statusCode: input.statusCode,
        data: input.data,
      }),
    getRouterParam: (event: TestEvent, name: string) => event.params?.[name],
    getQuery: (event: TestEvent) => event.query ?? {},
    ...globals,
  };
  for (const [name, value] of Object.entries(stubs)) vi.stubGlobal(name, value);
  return stubs as Record<string, ReturnType<typeof vi.fn>>;
}
