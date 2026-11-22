import type { H3Event } from "h3";
import type { BackendSession } from "../ports";
import { forwardedFor } from "../session/forwardedFor";
import { isCrossSiteWrite } from "../session/sameOrigin";
import { createSealer, sessionPasswords, type Sealer } from "../session/seal";
import {
  createSessionRegistry,
  createVisitorSession,
  type ScopeOptions,
  type SessionRegistry,
  type VisitorSession,
} from "../session/visitorSession";

/**
 * The storefront session (ADR 0001, step 4): an HttpOnly, SameSite=Lax
 * cookie (Secure and `__Host-` prefixed when `public.storeUrl` is https)
 * that carries the backends' states sealed with the shop's password
 * (`visitorSession.password`, NUXT_VISITOR_SESSION_PASSWORD; previous
 * passwords for a rotation in `previousPasswords`). No server-side
 * storage. Server routes hand adapters `backendSession(event, …)`.
 */

/** The cookie the Shopware layer of storefronts before 2.7 kept the token in. */
export const LEGACY_CONTEXT_COOKIE = "sw-context-token";

/** Sessions whose newest version the process remembers. */
const REGISTRY_ENTRIES = 50_000;

type SessionConfig = {
  maxAgeDays?: number | string;
  allowedOrigins?: string;
  password?: string;
  previousPasswords?: string;
};

const positive = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

let settings: { maxAgeSeconds: number; passwords: string[] } | undefined;

/**
 * `visitorSession` of the runtime config, validated once per process:
 * days a session lives after the last visit (30) and the passwords. In
 * production a missing or short password stops the server
 * (`server/plugins/visitor-session.ts` asks at startup); development
 * generates one and warns, so sessions end with the dev server.
 */
export function sessionSettings(): {
  maxAgeSeconds: number;
  passwords: string[];
} {
  if (!settings) {
    const config =
      (useRuntimeConfig() as { visitorSession?: SessionConfig })
        .visitorSession ?? {};
    const { passwords, generated } = sessionPasswords({
      password: String(config.password ?? ""),
      previousPasswords: String(config.previousPasswords ?? ""),
      production: !import.meta.dev,
    });
    if (generated) {
      console.warn(
        "[session] No NUXT_VISITOR_SESSION_PASSWORD: using a random one, sessions end with this process.",
      );
    }
    settings = {
      maxAgeSeconds: Math.round(positive(config.maxAgeDays, 30) * 86_400),
      passwords,
    };
  }
  return settings;
}

let sealer: { name: string; sealer: Sealer } | undefined;
let registry: SessionRegistry | undefined;

function sealerFor(name: string): Sealer {
  if (sealer?.name !== name) {
    sealer = {
      name,
      sealer: createSealer({ passwords: sessionSettings().passwords, name }),
    };
  }
  return sealer.sealer;
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
  const cookieName = sessionCookieName();
  const session = createVisitorSession({
    sealer: sealerFor(cookieName),
    registry: (registry ??= createSessionRegistry({
      maxEntries: REGISTRY_ENTRIES,
    })),
    cookieName,
    maxAgeSeconds: sessionSettings().maxAgeSeconds,
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
      // a `__Host-` cookie is only deleted by a Secure Set-Cookie
      remove: (name) =>
        deleteCookie(event, name, {
          path: "/",
          ...(name.startsWith("__Host-") ? { secure: true } : {}),
        }),
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
  const scope = visitor.scope(adapter, options);
  return {
    read: () => scope.read(),
    write: (state) => scope.write(state),
    forwardedFor: forwardedFor(
      getRequestHeader(event, "x-forwarded-for"),
      event.node?.req?.socket?.remoteAddress,
    ),
  };
}

/**
 * Refuses a state-changing request that a page of another site made the
 * browser send (CSRF, `server/session/sameOrigin.ts`): 403 with
 * `data.code` `cross_site_request`.
 */
export function assertSameOriginWrite(event: H3Event): void {
  const host = getRequestHeader(event, "host");
  const scheme = (
    event.node?.req?.socket as { encrypted?: boolean } | undefined
  )?.encrypted
    ? "https"
    : "http";
  const crossSite = isCrossSiteWrite({
    method: event.method,
    // forwarded headers are the client's to choose: not trusted here; a
    // shop with several https hosts behind a proxy lists them
    origins: [
      useRuntimeConfig().public.storeUrl,
      host ? `${scheme}://${host}` : undefined,
      ...allowedOrigins(),
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

/**
 * `visitorSession.allowedOrigins` (NUXT_VISITOR_SESSION_ALLOWED_ORIGINS,
 * comma-separated, e.g. `https://www.shop.example`): further origins the
 * storefront is reached under, next to `public.storeUrl`.
 */
function allowedOrigins(): string[] {
  const config = (useRuntimeConfig() as { visitorSession?: SessionConfig })
    .visitorSession;
  return String(config?.allowedOrigins ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Visitor-specific answers are never stored by a browser or proxy. */
export function answerPrivately(event: H3Event): void {
  setResponseHeader(event, "cache-control", "private, no-store");
}
