import { randomBytes } from "node:crypto";
import type { BackendSession } from "../ports";
import type { Sealer } from "./seal";

/** The cookies of one request and its answer. */
export interface CookieJar {
  get(name: string): string | undefined;
  /** Sets the session cookie (HttpOnly, SameSite=Lax; Secure on https). */
  write(name: string, value: string, maxAgeSeconds: number): void;
  remove(name: string): void;
}

/** A backend's view of the session; `create` allows the first write. */
export type ScopeOptions = Readonly<{ create: boolean }>;

/**
 * What the sealed cookie carries: the session's id (`sid`, random, stays
 * the same for the session), its version (`ver`, raised by every change of
 * a state), when it was sealed (`t`, ms) and one opaque state per adapter.
 */
type Payload = Readonly<{
  v: 1;
  sid: string;
  ver: number;
  t: number;
  s: Readonly<Record<string, string>>;
}>;

function isPayload(value: unknown): value is Payload {
  const payload = value as Payload | null;
  return (
    !!payload &&
    typeof payload === "object" &&
    payload.v === 1 &&
    typeof payload.sid === "string" &&
    Number.isInteger(payload.ver) &&
    typeof payload.t === "number" &&
    !!payload.s &&
    typeof payload.s === "object" &&
    Object.values(payload.s).every((state) => typeof state === "string")
  );
}

/**
 * The process's knowledge of the sessions it saw: the newest version of
 * each (bounded, least recently used first out) and a lock per session.
 * A request whose cookie is older than the newest version this process
 * sealed carries an outdated session (a parallel request replaced it).
 */
export interface SessionRegistry {
  newest(sid: string): number | undefined;
  /** Notes a version; an older one never replaces a newer one. */
  note(sid: string, ver: number): void;
  exclusive<T>(sid: string, task: () => Promise<T>): Promise<T>;
  size(): number;
}

export function createSessionRegistry(options: {
  maxEntries: number;
}): SessionRegistry {
  const versions = new Map<string, number>();
  const locks = new Map<string, Promise<unknown>>();
  return {
    newest: (sid) => versions.get(sid),
    note: (sid, ver) => {
      const known = versions.get(sid);
      versions.delete(sid);
      versions.set(sid, Math.max(known ?? 0, ver));
      while (versions.size > options.maxEntries) {
        versions.delete(versions.keys().next().value!);
      }
    },
    exclusive: <T>(sid: string, task: () => Promise<T>): Promise<T> => {
      const before = locks.get(sid) ?? Promise.resolve();
      const run = before.then(task, task);
      const settled = run.then(
        () => {},
        () => {},
      );
      locks.set(sid, settled);
      void settled.then(() => {
        if (locks.get(sid) === settled) locks.delete(sid);
      });
      return run;
    },
    size: () => versions.size,
  };
}

/**
 * The storefront session of one request (ADR 0001, step 4).
 *
 * - The cookie carries the states sealed (encrypted and authenticated,
 *   `seal.ts`): no server-side storage, so sessions survive restarts and
 *   deploys, and visitors without one cost nothing.
 * - A session is created by the first state an adapter writes (`create`).
 * - Every change of a state seals a new value with a higher version; a
 *   planted or leaked old value never carries the new state (fixation).
 * - A cookie is only set when this request changed a state (or extends
 *   the session once a day), so a request that changed nothing never
 *   overwrites a newer cookie.
 * - A request whose cookie is older than the newest version this process
 *   sealed is stale: its writes are dropped (`isStale()` lets routes answer
 *   409 before they act). Writes of one visitor run one after the other
 *   in `exclusive`.
 * - An expired, foreign or malformed cookie is a new visitor.
 */
export interface VisitorSession {
  scope(adapter: string, options: ScopeOptions): BackendSession;
  /** Runs `task` after the other exclusive tasks of this visitor. */
  exclusive<T>(task: () => Promise<T>): Promise<T>;
  /** The request's cookie is older than a state this process sealed. */
  isStale(): Promise<boolean>;
  /**
   * Takes over a backend token that an older storefront kept in a cookie
   * the browser could read (the Shopware layer's `sw-context-token`), once:
   * without a session it becomes the adapter's state; the cookie is
   * deleted either way.
   */
  migrateLegacyCookie(cookie: string, adapter: string): Promise<void>;
}

/** What a backend token of an older storefront may look like. */
const LEGACY_TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

/** A returning visitor's session is extended at most once a day. */
const TOUCH_AFTER_MS = 86_400_000;

/** Cookies longer than this are not ours. */
const MAX_COOKIE = 2048;

export function createVisitorSession(options: {
  sealer: Sealer;
  registry: SessionRegistry;
  cookies: CookieJar;
  cookieName: string;
  maxAgeSeconds: number;
  now?: () => number;
}): VisitorSession {
  const { sealer, registry, cookies, cookieName, maxAgeSeconds } = options;
  const now = options.now ?? Date.now;
  let loaded: Promise<Payload | null> | null = null;
  /** The session as this request knows it, after its own writes. */
  let current: Payload | null = null;
  let stale = false;

  /** Inside this visitor's `exclusive`: the lock is held already. */
  let holding = false;
  const locked = <T>(sid: string, task: () => Promise<T>) =>
    holding ? task() : registry.exclusive(sid, task);

  const seal = (payload: Payload) =>
    cookies.write(cookieName, sealer.seal(payload), maxAgeSeconds);

  const outdated = (payload: Payload) =>
    (registry.newest(payload.sid) ?? 0) > payload.ver;

  function load(): Promise<Payload | null> {
    loaded ??= (async () => {
      const value = cookies.get(cookieName);
      if (!value || value.length > MAX_COOKIE) return null;
      const payload = sealer.unseal(value);
      if (!isPayload(payload)) return null;
      if (now() - payload.t > maxAgeSeconds * 1000) return null;
      if (outdated(payload)) {
        stale = true;
      } else {
        registry.note(payload.sid, payload.ver);
        if (now() - payload.t > TOUCH_AFTER_MS) {
          current = { ...payload, t: now() };
          seal(current);
          return current;
        }
      }
      current = payload;
      return payload;
    })();
    return loaded;
  }

  function start(adapter: string, state: string) {
    current = {
      v: 1,
      sid: randomBytes(16).toString("base64url"),
      ver: 1,
      t: now(),
      s: { [adapter]: state },
    };
    registry.note(current.sid, current.ver);
    loaded = Promise.resolve(current);
    seal(current);
  }

  function scope(adapter: string, { create }: ScopeOptions): BackendSession {
    return {
      read: async () => {
        await load();
        return current?.s[adapter];
      },
      write: async (state) => {
        await load();
        const base = current;
        if (!base) {
          if (state !== undefined && create && !stale) start(adapter, state);
          return;
        }
        await locked(base.sid, async () => {
          const payload = current;
          if (!payload) return;
          if (outdated(payload)) {
            // a parallel request replaced the session: its state wins
            stale = true;
            return;
          }
          if (payload.s[adapter] === state) return;
          const states = Object.fromEntries([
            ...Object.entries(payload.s).filter(([name]) => name !== adapter),
            ...(state === undefined ? [] : [[adapter, state]]),
          ]);
          const next: Payload = {
            ...payload,
            ver: payload.ver + 1,
            t: now(),
            s: states,
          };
          registry.note(next.sid, next.ver);
          if (Object.keys(states).length === 0) {
            cookies.remove(cookieName);
            current = null;
            return;
          }
          current = next;
          seal(next);
        });
      },
    };
  }

  return {
    scope,
    isStale: async () => {
      await load();
      if (current && outdated(current)) stale = true;
      return stale;
    },
    exclusive: async (task) => {
      const payload = await load();
      if (!payload || holding) return task();
      return registry.exclusive(payload.sid, async () => {
        holding = true;
        try {
          return await task();
        } finally {
          holding = false;
        }
      });
    },
    migrateLegacyCookie: async (cookie, adapter) => {
      const token = cookies.get(cookie);
      if (token === undefined) return;
      cookies.remove(cookie);
      if (!LEGACY_TOKEN.test(token)) return;
      if (await load()) return;
      if (!stale) start(adapter, token);
    },
  };
}
