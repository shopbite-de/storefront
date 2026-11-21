import type { BackendSession } from "../ports";
import { SESSION_ID, type SessionRecord, type SessionStore } from "./store";

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
 * The storefront session of one request (ADR 0001, step 4).
 *
 * - The cookie holds a random id only; the states live in the store.
 * - A session is created by the first state an adapter writes, never by a
 *   read (bots and first page views cost nothing).
 * - When an adapter replaces its state (Shopware: a new context token on
 *   login, logout or registration), the session gets a new id and the old
 *   one is marked moved: a planted or leaked id never carries the new
 *   state (session fixation).
 * - A write only applies to the state the request read: if a parallel
 *   request of the same visitor replaced it in the meantime, the newer
 *   state wins and the stale write is dropped.
 * - An unknown, expired or moved id is a new visitor; its id is not reused.
 */
export interface VisitorSession {
  scope(adapter: string, options: ScopeOptions): BackendSession;
  /** Runs `task` after the other exclusive tasks of this visitor. */
  exclusive<T>(task: () => Promise<T>): Promise<T>;
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

export function createVisitorSession(options: {
  store: SessionStore;
  cookies: CookieJar;
  cookieName: string;
}): VisitorSession {
  const { store, cookies, cookieName } = options;
  const fromCookie = cookies.get(cookieName);
  let id: string | null =
    fromCookie && SESSION_ID.test(fromCookie) ? fromCookie : null;
  let loaded: Promise<SessionRecord | null> | null = null;
  /** The state of each adapter as this request saw it last. */
  const seen = new Map<string, string | undefined>();

  /** Inside this visitor's `exclusive`: the lock is held already. */
  let holding = false;
  const locked = <T>(lockId: string, task: () => Promise<T>) =>
    holding ? task() : store.exclusive(lockId, task);

  const setCookie = (value: string) =>
    cookies.write(cookieName, value, store.maxAgeSeconds);

  function load(): Promise<SessionRecord | null> {
    loaded ??= (async () => {
      if (!id) return null;
      const record = await store.get(id);
      if (record && store.now() - record.touchedAt > TOUCH_AFTER_MS) {
        const current = id;
        await locked(current, async () => {
          const fresh = await store.get(current);
          if (fresh)
            await store.save(current, { ...fresh, touchedAt: store.now() });
        });
        setCookie(current);
      }
      return record;
    })();
    return loaded;
  }

  async function startSession(adapter: string, state: string) {
    id = await store.create({ [adapter]: state });
    loaded = Promise.resolve(await store.get(id));
    setCookie(id);
  }

  function scope(adapter: string, { create }: ScopeOptions): BackendSession {
    return {
      read: async () => {
        const state = (await load())?.states[adapter];
        seen.set(adapter, state);
        return state;
      },
      write: async (state) => {
        const base = seen.has(adapter)
          ? seen.get(adapter)
          : (await load())?.states[adapter];
        if (!id) {
          if (state !== undefined && create) await startSession(adapter, state);
          seen.set(adapter, state);
          return;
        }
        const current = id;
        await locked(current, async () => {
          const record = await store.load(current);
          if (!record || record.moved) {
            // expired, evicted or moved away by a parallel request: a
            // moved id is never revived; an expired one is not reused
            if (!record && state !== undefined && create) {
              await startSession(adapter, state);
              seen.set(adapter, state);
            }
            return;
          }
          const stored = record.states[adapter];
          if (stored !== base) {
            // a parallel request of this visitor replaced the state
            seen.set(adapter, stored);
            return;
          }
          if (stored === state) return;

          const states = Object.fromEntries([
            ...Object.entries(record.states).filter(
              ([name]) => name !== adapter,
            ),
            ...(state === undefined ? [] : [[adapter, state]]),
          ]);
          const next: SessionRecord = {
            ...record,
            states,
            touchedAt: store.now(),
          };

          if (Object.keys(states).length === 0) {
            await store.remove(current);
            cookies.remove(cookieName);
            id = null;
          } else if (stored === undefined) {
            // the adapter's first state in this session: no new id needed
            await store.save(current, next);
          } else {
            id = await store.move(current, next);
            setCookie(id);
          }
          loaded = Promise.resolve(
            id ? { ...next, touchedAt: store.now() } : null,
          );
          seen.set(adapter, state);
        });
      },
    };
  }

  return {
    scope,
    exclusive: (task) => {
      if (!id || holding) return task();
      return store.exclusive(id, async () => {
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
      await startSession(adapter, token);
    },
  };
}
