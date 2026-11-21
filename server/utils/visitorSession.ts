import type { H3Event } from "h3";
import type { BackendSession } from "../ports";
import { isCrossSiteWrite } from "../session/sameOrigin";
import {
  createSessionStore,
  type SessionStorage,
  type SessionStore,
} from "../session/store";
import {
  createVisitorSession,
  type ScopeOptions,
  type VisitorSession,
} from "../session/visitorSession";

/**
 * The storefront session (ADR 0001, step 4): an HttpOnly, SameSite=Lax
 * cookie with a random id (Secure and `__Host-` prefixed when
 * `public.storeUrl` is https); the backends' states live in the Nitro
 * storage `shopbite-session` (default: a bounded LRU in memory, mounted by
 * `server/plugins/visitor-session.ts`; a shop with several instances mounts
 * Redis there). Server routes hand adapters `backendSession(event, …)`.
 */
export const SESSION_STORAGE = "shopbite-session";

/** The cookie the Shopware layer of storefronts before 2.7 kept the token in. */
export const LEGACY_CONTEXT_COOKIE = "sw-context-token";

type SessionConfig = { maxAgeDays?: number | string };

let store: { maxAgeSeconds: number; store: SessionStore } | undefined;

function sessionStore(): SessionStore {
  const config = (useRuntimeConfig() as { visitorSession?: SessionConfig })
    .visitorSession;
  const days = Number(config?.maxAgeDays ?? 30);
  const maxAgeSeconds = Math.round((days > 0 ? days : 30) * 86_400);
  if (store?.maxAgeSeconds !== maxAgeSeconds) {
    store = {
      maxAgeSeconds,
      store: createSessionStore({
        storage: useStorage(SESSION_STORAGE) as unknown as SessionStorage,
        maxAgeSeconds,
      }),
    };
  }
  return store.store;
}

function isSecure(): boolean {
  return /^https:/i.test(useRuntimeConfig().public.storeUrl ?? "");
}

/** `__Host-` binds the cookie to this host: no subdomain can plant it. */
export function sessionCookieName(): string {
  return isSecure() ? "__Host-shopbite-session" : "shopbite-session";
}

const CONTEXT_KEY = "shopbiteVisitorSession";

/** The visitor's session for this request (one per request). */
export function useVisitorSession(event: H3Event): VisitorSession {
  const context = event.context as Record<string, unknown>;
  const existing = context[CONTEXT_KEY] as VisitorSession | undefined;
  if (existing) return existing;
  const secure = isSecure();
  const session = createVisitorSession({
    store: sessionStore(),
    cookieName: sessionCookieName(),
    cookies: {
      get: (name) => getCookie(event, name),
      write: (name, value, maxAge) =>
        setCookie(event, name, value, {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge,
        }),
      remove: (name) => deleteCookie(event, name, { path: "/" }),
    },
  });
  context[CONTEXT_KEY] = session;
  return session;
}

/**
 * The adapter's view of the visitor's session. Read-only routes pass
 * `create: false`: a visitor without a session gets none from a read. The
 * context token cookie of the old Shopware layer is taken over first.
 */
export async function backendSession(
  event: H3Event,
  adapter: string,
  options: ScopeOptions,
): Promise<BackendSession> {
  const visitor = useVisitorSession(event);
  await visitor.migrateLegacyCookie(LEGACY_CONTEXT_COOKIE, "shopware");
  return visitor.scope(adapter, options);
}

/**
 * Refuses a state-changing request that a page of another site made the
 * browser send (CSRF, `server/session/sameOrigin.ts`): 403 with
 * `data.code` `cross_site_request`.
 */
export function assertSameOriginWrite(event: H3Event): void {
  let storeHost: string | undefined;
  try {
    storeHost = new URL(useRuntimeConfig().public.storeUrl).host;
  } catch {
    storeHost = undefined;
  }
  const crossSite = isCrossSiteWrite({
    method: event.method,
    hosts: [
      getRequestHeader(event, "host"),
      getRequestHeader(event, "x-forwarded-host")?.split(",")[0]?.trim(),
      storeHost,
    ],
    origin: getRequestHeader(event, "origin"),
    secFetchSite: getRequestHeader(event, "sec-fetch-site"),
  });
  if (crossSite) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      data: { code: "cross_site_request" },
    });
  }
}

/** Visitor-specific answers are never stored by a browser or proxy. */
export function answerPrivately(event: H3Event): void {
  setResponseHeader(event, "cache-control", "private, no-store");
}
