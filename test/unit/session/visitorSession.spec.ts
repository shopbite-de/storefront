import { describe, expect, it } from "vitest";
import {
  createSessionStore,
  memorySessionStorage,
  type SessionStore,
} from "../../../server/session/store";
import {
  createVisitorSession,
  type CookieJar,
  type VisitorSession,
} from "../../../server/session/visitorSession";

/**
 * The storefront's own session (ADR 0001, step 4): the browser holds an
 * opaque id in an HttpOnly cookie; what a backend needs to recognise the
 * visitor (Shopware: the context token) lives server-side, one state per
 * adapter.
 */
const COOKIE = "shopbite-session";
const DAY = 86_400;

type Jar = CookieJar & {
  values: Map<string, string>;
  set: { name: string; value: string; maxAge: number }[];
  deleted: string[];
};

function jar(initial: Record<string, string> = {}): Jar {
  const values = new Map(Object.entries(initial));
  const set: Jar["set"] = [];
  const deleted: string[] = [];
  return {
    values,
    set,
    deleted,
    get: (name) => values.get(name),
    write: (name, value, maxAge) => {
      values.set(name, value);
      set.push({ name, value, maxAge });
    },
    remove: (name) => {
      values.delete(name);
      deleted.push(name);
    },
  };
}

function setup(options: { now?: () => number; maxEntries?: number } = {}) {
  const storage = memorySessionStorage({
    maxEntries: options.maxEntries ?? 100,
    maxAgeSeconds: 30 * DAY,
  });
  const store = createSessionStore({
    storage,
    maxAgeSeconds: 30 * DAY,
    now: options.now,
  });
  const visit = (cookies: Jar = jar()): VisitorSession =>
    createVisitorSession({ store, cookies, cookieName: COOKIE });
  return { store, storage, visit };
}

/** A browser: keeps the cookies the answers set, like a real one. */
function browser() {
  const cookies = new Map<string, string>();
  return {
    cookies,
    request: () => {
      const request = jar(Object.fromEntries(cookies));
      return Object.assign(request, {
        apply: () => {
          for (const { name, value } of request.set) cookies.set(name, value);
          for (const name of request.deleted) cookies.delete(name);
        },
      });
    },
  };
}

async function sessionWith(
  _store: SessionStore,
  visit: (cookies?: Jar) => VisitorSession,
  state: string,
) {
  const cookies = jar();
  await visit(cookies).scope("shopware", { create: true }).write(state);
  return cookies.values.get(COOKIE)!;
}

describe("visitor session", () => {
  it("has no state and sets no cookie for a first visit", async () => {
    const { visit } = setup();
    const cookies = jar();
    const session = visit(cookies).scope("shopware", { create: true });

    expect(await session.read()).toBeUndefined();
    expect(cookies.set).toEqual([]);
  });

  it("creates the session with the first state: an opaque HttpOnly id, never the state", async () => {
    const { visit } = setup();
    const cookies = jar();
    const session = visit(cookies).scope("shopware", { create: true });

    await session.write("token-1");

    expect(cookies.set).toHaveLength(1);
    const [cookie] = cookies.set;
    expect(cookie!.name).toBe(COOKIE);
    expect(cookie!.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookie!.value).not.toContain("token-1");
    expect(cookie!.maxAge).toBe(30 * DAY);
    expect(await session.read()).toBe("token-1");
  });

  it("does not create a session on a read-only request", async () => {
    const { visit } = setup();
    const cookies = jar();
    const session = visit(cookies).scope("shopware", { create: false });

    await session.write("token-1");

    expect(cookies.set).toEqual([]);
    expect(await session.read()).toBeUndefined();
  });

  it("finds the state again on the next request", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");

    const next = visit(jar({ [COOKIE]: id })).scope("shopware", {
      create: false,
    });
    expect(await next.read()).toBe("token-1");
  });

  it("keeps one state per adapter", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");

    const cookies = jar({ [COOKIE]: id });
    const visitor = visit(cookies);
    await visitor.scope("memory", { create: true }).write("cart-7");

    expect(await visitor.scope("shopware", { create: false }).read()).toBe(
      "token-1",
    );
    expect(await visitor.scope("memory", { create: false }).read()).toBe(
      "cart-7",
    );
    // a first state of another adapter is no rotation: same id
    expect(cookies.set).toEqual([]);
  });

  it("gives a new session id when the backend replaces its state (session fixation)", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");

    const cookies = jar({ [COOKIE]: id });
    const session = visit(cookies).scope("shopware", { create: false });
    expect(await session.read()).toBe("token-1");
    await session.write("token-2");

    const [cookie] = cookies.set;
    expect(cookie?.value).toBeDefined();
    expect(cookie!.value).not.toBe(id);
    expect(await session.read()).toBe("token-2");
    // the old id carries nothing any more
    const old = visit(jar({ [COOKIE]: id })).scope("shopware", {
      create: true,
    });
    expect(await old.read()).toBeUndefined();
    const fresh = visit(jar({ [COOKIE]: cookie!.value })).scope("shopware", {
      create: false,
    });
    expect(await fresh.read()).toBe("token-2");
  });

  it("writing the same state again changes nothing", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");
    const cookies = jar({ [COOKIE]: id });
    const session = visit(cookies).scope("shopware", { create: false });

    await session.write("token-1");

    expect(cookies.set).toEqual([]);
    expect(await session.read()).toBe("token-1");
  });

  it("does not lose a rotated state to a parallel request that read the old one", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");
    const a = visit(jar({ [COOKIE]: id })).scope("shopware", {
      create: false,
    });
    const bCookies = jar({ [COOKIE]: id });
    const b = visit(bCookies).scope("shopware", { create: true });
    expect(await a.read()).toBe("token-1");
    expect(await b.read()).toBe("token-1");

    // A logs in (new token), B's answer still carries another token
    await a.write("token-login");
    await b.write("token-stale");

    expect(bCookies.set).toEqual([]);
    const after = await store.get(id);
    // the old id is gone (moved); B neither revived it nor made a session
    expect(after).toBeNull();
    expect(bCookies.values.get(COOKIE)).toBe(id);
  });

  it("serialises the writes of one visitor in `exclusive`", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");
    const order: string[] = [];
    const first = visit(jar({ [COOKIE]: id })).exclusive(async () => {
      order.push("first:start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("first:end");
    });
    const second = visit(jar({ [COOKIE]: id })).exclusive(async () => {
      order.push("second");
    });
    await Promise.all([first, second]);

    expect(order).toEqual(["first:start", "first:end", "second"]);
  });

  it("sees the state another request wrote while it waited in `exclusive`", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");
    const firstCookies = jar({ [COOKIE]: id });
    const first = visit(firstCookies);
    const second = visit(jar({ [COOKIE]: id }));

    const run = Promise.all([
      first.exclusive(async () => {
        const session = first.scope("shopware", { create: true });
        await session.read();
        await session.write("token-2");
      }),
      second.exclusive(async () =>
        second.scope("shopware", { create: true }).read(),
      ),
    ]);
    const [, seen] = await run;

    // the second request still carries the old id: rotated away, so it
    // reads nothing (the browser has the new cookie for its next request)
    expect(seen).toBeUndefined();
    const next = visit(jar({ [COOKIE]: firstCookies.values.get(COOKIE)! }));
    expect(await next.scope("shopware", { create: false }).read()).toBe(
      "token-2",
    );
  });

  it("never mixes the states of two visitors under concurrency", async () => {
    const { visit } = setup();
    const alice = browser();
    const bob = browser();

    // first writes of both visitors interleaved
    const ra = alice.request();
    const rb = bob.request();
    await Promise.all([
      visit(ra).scope("shopware", { create: true }).write("alice-token"),
      visit(rb).scope("shopware", { create: true }).write("bob-token"),
    ]);
    ra.apply();
    rb.apply();

    const reads = await Promise.all(
      Array.from({ length: 20 }, (_, i) => {
        const who = i % 2 ? alice : bob;
        return visit(who.request()).scope("shopware", { create: false }).read();
      }),
    );
    expect(reads).toEqual(
      Array.from({ length: 20 }, (_, i) =>
        i % 2 ? "alice-token" : "bob-token",
      ),
    );
    expect(alice.cookies.get(COOKIE)).not.toBe(bob.cookies.get(COOKIE));
  });

  it("treats an unknown or expired id as a new visitor and never reuses it", async () => {
    let now = Date.parse("2026-11-21T12:00:00Z");
    const { store, visit } = setup({ now: () => now });
    const id = await sessionWith(store, visit, "token-1");

    now += 31 * DAY * 1000;
    const cookies = jar({ [COOKIE]: id });
    const session = visit(cookies).scope("shopware", { create: true });
    expect(await session.read()).toBeUndefined();

    await session.write("token-2");
    expect(cookies.set[0]!.value).not.toBe(id);

    const planted = jar({ [COOKIE]: "a".repeat(43) });
    const fromPlanted = visit(planted).scope("shopware", { create: true });
    await fromPlanted.write("token-3");
    expect(planted.set[0]!.value).not.toBe("a".repeat(43));
  });

  it("ignores a malformed cookie", async () => {
    const { visit } = setup();
    const session = visit(jar({ [COOKIE]: "../../etc" })).scope("shopware", {
      create: false,
    });
    expect(await session.read()).toBeUndefined();
  });

  it("extends the session of a returning visitor, at most once a day", async () => {
    let now = Date.parse("2026-11-21T12:00:00Z");
    const { store, visit } = setup({ now: () => now });
    const id = await sessionWith(store, visit, "token-1");

    now += 2 * 3600 * 1000;
    const soon = jar({ [COOKIE]: id });
    await visit(soon).scope("shopware", { create: false }).read();
    expect(soon.set).toEqual([]);

    now += 2 * DAY * 1000;
    const later = jar({ [COOKIE]: id });
    await visit(later).scope("shopware", { create: false }).read();
    expect(later.set).toEqual([{ name: COOKIE, value: id, maxAge: 30 * DAY }]);
    // 29 days after the last visit it still lives
    now += 29 * DAY * 1000;
    expect(
      await visit(jar({ [COOKIE]: id }))
        .scope("shopware", { create: false })
        .read(),
    ).toBe("token-1");
  });

  it("forgets the state and the cookie when the adapter writes undefined", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");
    const cookies = jar({ [COOKIE]: id });
    const session = visit(cookies).scope("shopware", { create: false });

    await session.write(undefined);

    expect(await session.read()).toBeUndefined();
    expect(cookies.deleted).toContain(COOKIE);
    expect(await store.get(id)).toBeNull();
  });

  it("takes over the context token cookie of the old layer once", async () => {
    const { visit } = setup();
    const cookies = jar({
      "sw-context-token": "LegacyToken1234567890abcdefABCDEF",
    });
    const visitor = visit(cookies);

    await visitor.migrateLegacyCookie("sw-context-token", "shopware");

    expect(cookies.deleted).toContain("sw-context-token");
    const id = cookies.values.get(COOKIE);
    expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await visitor.scope("shopware", { create: false }).read()).toBe(
      "LegacyToken1234567890abcdefABCDEF",
    );
  });

  it("keeps an existing session over a context token cookie left behind", async () => {
    const { store, visit } = setup();
    const id = await sessionWith(store, visit, "token-1");
    const cookies = jar({
      [COOKIE]: id,
      "sw-context-token": "Leftover12345678",
    });
    const visitor = visit(cookies);

    await visitor.migrateLegacyCookie("sw-context-token", "shopware");

    expect(cookies.deleted).toContain("sw-context-token");
    expect(cookies.values.get(COOKIE)).toBe(id);
    expect(await visitor.scope("shopware", { create: false }).read()).toBe(
      "token-1",
    );
  });

  it("drops a malformed context token cookie without a session", async () => {
    const { visit } = setup();
    const cookies = jar({ "sw-context-token": "<script>" });
    const visitor = visit(cookies);

    await visitor.migrateLegacyCookie("sw-context-token", "shopware");

    expect(cookies.deleted).toContain("sw-context-token");
    expect(cookies.set).toEqual([]);
  });

  it("bounds the storage: the least recently used sessions are dropped", async () => {
    const { store, visit } = setup({ maxEntries: 3 });
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await sessionWith(store, visit, `token-${i}`));
    }
    const states = await Promise.all(
      ids.map((id) =>
        visit(jar({ [COOKIE]: id }))
          .scope("shopware", { create: false })
          .read(),
      ),
    );
    expect(states).toEqual([
      undefined,
      undefined,
      "token-2",
      "token-3",
      "token-4",
    ]);
  });
});
