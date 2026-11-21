import { describe, expect, it } from "vitest";
import { createSealer } from "../../../server/session/seal";
import {
  createSessionRegistry,
  createVisitorSession,
  type CookieJar,
  type SessionRegistry,
  type VisitorSession,
} from "../../../server/session/visitorSession";

/**
 * The storefront's own session (ADR 0001, step 4): the HttpOnly cookie
 * carries what a backend needs to recognise the visitor (Shopware: the
 * context token), one state per adapter, sealed with the shop's password.
 * No server-side storage: sessions survive restarts and deploys. A small
 * registry in the process orders the writes of a visitor and recognises a
 * request that carries an outdated cookie.
 */
const COOKIE = "shopbite-session";
const DAY = 86_400;
const PASSWORD = "p".repeat(40);

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

function setup(
  options: { now?: () => number; registry?: SessionRegistry } = {},
) {
  const sealer = createSealer({ passwords: [PASSWORD], name: COOKIE });
  const registry =
    options.registry ?? createSessionRegistry({ maxEntries: 100 });
  const visit = (cookies: Jar = jar()): VisitorSession =>
    createVisitorSession({
      sealer,
      registry,
      cookies,
      cookieName: COOKIE,
      maxAgeSeconds: 30 * DAY,
      now: options.now,
    });
  return { sealer, registry, visit };
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

async function cookieWith(
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

  it("seals the first state into the cookie: small, and the token is not readable", async () => {
    const { visit } = setup();
    const cookies = jar();
    const session = visit(cookies).scope("shopware", { create: true });

    await session.write("ContextToken0123456789abcdefABCD");

    expect(cookies.set).toHaveLength(1);
    const [cookie] = cookies.set;
    expect(cookie!.name).toBe(COOKIE);
    expect(cookie!.maxAge).toBe(30 * DAY);
    expect(cookie!.value).toMatch(/^v1\./);
    expect(cookie!.value).not.toContain("ContextToken");
    expect(cookie!.value.length).toBeLessThan(400);
    expect(await session.read()).toBe("ContextToken0123456789abcdefABCD");
  });

  it("does not create a session on a read-only request", async () => {
    const { visit } = setup();
    const cookies = jar();
    await visit(cookies).scope("shopware", { create: false }).write("token-1");
    expect(cookies.set).toEqual([]);
  });

  it("finds the state again on the next request", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    expect(
      await visit(jar({ [COOKIE]: value }))
        .scope("shopware", { create: false })
        .read(),
    ).toBe("token-1");
  });

  it("keeps the session over a restart: a new process reads the cookie", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");

    const restarted = setup({
      registry: createSessionRegistry({ maxEntries: 100 }),
    });
    const cookies = jar({ [COOKIE]: value });
    const session = restarted
      .visit(cookies)
      .scope("shopware", { create: true });
    expect(await session.read()).toBe("token-1");
    await session.write("token-2");
    expect(
      await restarted
        .visit(jar({ [COOKIE]: cookies.values.get(COOKIE)! }))
        .scope("shopware", { create: false })
        .read(),
    ).toBe("token-2");
  });

  it("keeps one state per adapter", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const cookies = jar({ [COOKIE]: value });
    await visit(cookies).scope("memory", { create: true }).write("cart-7");

    const next = visit(jar({ [COOKIE]: cookies.values.get(COOKIE)! }));
    expect(await next.scope("shopware", { create: false }).read()).toBe(
      "token-1",
    );
    expect(await next.scope("memory", { create: false }).read()).toBe("cart-7");
  });

  it("seals a new value when the backend replaces its state (session fixation)", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const cookies = jar({ [COOKIE]: value });
    const session = visit(cookies).scope("shopware", { create: false });
    await session.read();

    await session.write("token-2");

    expect(cookies.set).toHaveLength(1);
    expect(cookies.set[0]!.value).not.toBe(value);
    expect(await session.read()).toBe("token-2");
  });

  it("writing the same state again sets no cookie", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const cookies = jar({ [COOKIE]: value });
    await visit(cookies).scope("shopware", { create: false }).write("token-1");
    expect(cookies.set).toEqual([]);
  });

  it("never lets a parallel request with the old cookie overwrite a rotated state", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const aCookies = jar({ [COOKIE]: value });
    const bCookies = jar({ [COOKIE]: value });
    const a = visit(aCookies);
    const b = visit(bCookies);
    expect(await a.scope("shopware", { create: false }).read()).toBe("token-1");
    expect(await b.scope("shopware", { create: true }).read()).toBe("token-1");

    // A logs in (new token); B's answer carries another token later
    await a.scope("shopware", { create: false }).write("token-login");
    await b.scope("shopware", { create: true }).write("token-stale");

    expect(aCookies.set).toHaveLength(1);
    expect(bCookies.set).toEqual([]);
    expect(await b.isStale()).toBe(true);
    expect(await a.isStale()).toBe(false);
  });

  it("serialises the writes of one visitor in `exclusive`; the later one sees it is stale", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const order: string[] = [];
    const first = visit(jar({ [COOKIE]: value }));
    const second = visit(jar({ [COOKIE]: value }));

    await Promise.all([
      first.exclusive(async () => {
        order.push("first:start");
        await new Promise((resolve) => setTimeout(resolve, 20));
        await first.scope("shopware", { create: true }).write("token-2");
        order.push("first:end");
      }),
      second.exclusive(async () => {
        order.push(`second:stale=${await second.isStale()}`);
      }),
    ]);

    expect(order).toEqual(["first:start", "first:end", "second:stale=true"]);
  });

  it("never mixes the states of two visitors under concurrency", async () => {
    const { visit } = setup();
    const alice = browser();
    const bob = browser();
    const ra = alice.request();
    const rb = bob.request();
    await Promise.all([
      visit(ra).scope("shopware", { create: true }).write("alice-token"),
      visit(rb).scope("shopware", { create: true }).write("bob-token"),
    ]);
    ra.apply();
    rb.apply();

    const reads = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        visit((i % 2 ? alice : bob).request())
          .scope("shopware", { create: false })
          .read(),
      ),
    );
    expect(reads).toEqual(
      Array.from({ length: 20 }, (_, i) =>
        i % 2 ? "alice-token" : "bob-token",
      ),
    );
  });

  it("treats an expired, foreign or malformed cookie as a new visitor", async () => {
    let now = Date.parse("2026-11-21T12:00:00Z");
    const { visit } = setup({ now: () => now });
    const value = await cookieWith(visit, "token-1");

    now += 31 * DAY * 1000;
    expect(
      await visit(jar({ [COOKIE]: value }))
        .scope("shopware", { create: true })
        .read(),
    ).toBeUndefined();

    const foreign = createSealer({
      passwords: ["x".repeat(40)],
      name: COOKIE,
    }).seal({ v: 1, sid: "s", ver: 1, t: now, s: { shopware: "planted" } });
    for (const cookie of [foreign, "../../etc", "v1.a.b.c"]) {
      expect(
        await visit(jar({ [COOKIE]: cookie }))
          .scope("shopware", { create: false })
          .read(),
      ).toBeUndefined();
    }
  });

  it("re-seals a cookie of a previous password with the current one (rotation)", async () => {
    const old = createSealer({ passwords: ["o".repeat(40)], name: COOKIE });
    const registry = createSessionRegistry({ maxEntries: 100 });
    const sealer = createSealer({
      passwords: [PASSWORD, "o".repeat(40)],
      name: COOKIE,
    });
    const cookies = jar({
      [COOKIE]: old.seal({
        v: 1,
        sid: "sid-1",
        ver: 3,
        t: Date.now(),
        s: { shopware: "token-1" },
      }),
    });
    const session = createVisitorSession({
      sealer,
      registry,
      cookies,
      cookieName: COOKIE,
      maxAgeSeconds: 30 * DAY,
    }).scope("shopware", { create: false });

    expect(await session.read()).toBe("token-1");
    expect(cookies.set).toHaveLength(1);
    expect(sealer.isCurrent(cookies.set[0]!.value)).toBe(true);
    expect(old.unseal(cookies.set[0]!.value)).toBeNull();
  });

  it("refuses a seal from the future or with an absurd version", async () => {
    const { sealer, visit } = setup();
    const now = Date.now();
    for (const payload of [
      { v: 1, sid: "s", ver: 1, t: now + 3_600_000, s: { shopware: "a" } },
      { v: 1, sid: "s", ver: 0, t: now, s: { shopware: "a" } },
      { v: 1, sid: "s", ver: 1e12, t: now, s: { shopware: "a" } },
      { v: 1, sid: "", ver: 1, t: now, s: { shopware: "a" } },
    ]) {
      expect(
        await visit(jar({ [COOKIE]: sealer.seal(payload) }))
          .scope("shopware", { create: false })
          .read(),
      ).toBeUndefined();
    }
  });

  it("extends the session of a returning visitor, at most once a day", async () => {
    let now = Date.parse("2026-11-21T12:00:00Z");
    const { visit } = setup({ now: () => now });
    const value = await cookieWith(visit, "token-1");

    now += 2 * 3600 * 1000;
    const soon = jar({ [COOKIE]: value });
    await visit(soon).scope("shopware", { create: false }).read();
    expect(soon.set).toEqual([]);

    now += 2 * DAY * 1000;
    const later = jar({ [COOKIE]: value });
    await visit(later).scope("shopware", { create: false }).read();
    expect(later.set).toHaveLength(1);
    now += 29 * DAY * 1000;
    expect(
      await visit(jar({ [COOKIE]: later.set[0]!.value }))
        .scope("shopware", { create: false })
        .read(),
    ).toBe("token-1");
  });

  it("forgets the state and the cookie when the adapter writes undefined", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const cookies = jar({ [COOKIE]: value });
    const session = visit(cookies).scope("shopware", { create: false });
    await session.write(undefined);
    expect(await session.read()).toBeUndefined();
    expect(cookies.deleted).toContain(COOKIE);
  });

  it("takes over the context token cookie of the old layer once", async () => {
    const { visit } = setup();
    const cookies = jar({
      "sw-context-token": "LegacyToken1234567890abcdefABCDEF",
    });
    const visitor = visit(cookies);

    await visitor.migrateLegacyCookie("sw-context-token", "shopware");

    expect(cookies.deleted).toContain("sw-context-token");
    expect(cookies.values.get(COOKIE)).toMatch(/^v1\./);
    expect(await visitor.scope("shopware", { create: false }).read()).toBe(
      "LegacyToken1234567890abcdefABCDEF",
    );
  });

  it("keeps an existing session over a context token cookie left behind", async () => {
    const { visit } = setup();
    const value = await cookieWith(visit, "token-1");
    const cookies = jar({
      [COOKIE]: value,
      "sw-context-token": "Leftover12345678",
    });
    const visitor = visit(cookies);

    await visitor.migrateLegacyCookie("sw-context-token", "shopware");

    expect(cookies.deleted).toContain("sw-context-token");
    expect(cookies.values.get(COOKIE)).toBe(value);
    expect(await visitor.scope("shopware", { create: false }).read()).toBe(
      "token-1",
    );
  });

  it("drops a malformed context token cookie without a session", async () => {
    const { visit } = setup();
    const cookies = jar({ "sw-context-token": "<script>" });
    await visit(cookies).migrateLegacyCookie("sw-context-token", "shopware");
    expect(cookies.deleted).toContain("sw-context-token");
    expect(cookies.set).toEqual([]);
  });

  it("bounds the registry: a forgotten session still reads, it is just not ordered", async () => {
    const registry = createSessionRegistry({ maxEntries: 2 });
    const { visit } = setup({ registry });
    const values = [];
    for (let i = 0; i < 4; i++) {
      values.push(await cookieWith(visit, `token-${i}`));
    }
    expect(registry.size()).toBe(2);
    for (const [i, value] of values.entries()) {
      const visitor = visit(jar({ [COOKIE]: value }));
      expect(await visitor.scope("shopware", { create: false }).read()).toBe(
        `token-${i}`,
      );
      expect(await visitor.isStale()).toBe(false);
    }
  });
});
