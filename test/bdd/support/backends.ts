/**
 * The backend a behaviour scenario runs against, from the outside: how it
 * is set to the restaurant a scenario needs and where its mails go. The
 * storefront under test reaches it only through its own adapter.
 *
 * - memory: the storefront's in-memory adapter, controlled through the
 *   test seam of a SHOPBITE_TEST_SEAMS=1 build (`test/bdd/seam/`); the
 *   restaurant's clock reads 12:xx whenever the suite runs.
 * - shopware: a Shopware with the ShopBite plugin seeded like the public
 *   quickstart (github.com/shopbite-de/shopbite), controlled through its
 *   Admin API, mails in Mailpit; the restaurant's clock is Berlin's.
 */
import type { APIRequestContext } from "@playwright/test";

export type BackendName = "memory" | "shopware";

export type RestaurantScenario = Readonly<{
  /**
   * `open`: open now and for hours to come (default); `closed-for-today`:
   * today's opening hours are over (it opens again tomorrow).
   */
  hours?: "open" | "closed-for-today";
  /** The checkout switch (false: ordering paused). Default: true. */
  acceptsOrders?: boolean;
}>;

/** The memory restaurant's clock reads 12:xx (test/bdd/seam/scenario.ts). */
const MEMORY_HOURS = {
  open: { from: "10:00", to: "22:00" },
  "closed-for-today": { from: "06:00", to: "11:00" },
};

/** A mail the backend sent, as far as the scenarios read it. */
export type SentMail = Readonly<{ to: string; links: readonly string[] }>;

export interface Backend {
  readonly name: BackendName;
  /** Before every scenario: the restaurant of the scenario. */
  start(scenario?: RestaurantScenario): Promise<void>;
  /** During a scenario: changes the restaurant, visitors stay. */
  change(scenario: RestaurantScenario): Promise<void>;
  /** After every scenario: leaves the backend as the next one expects it. */
  finish(): Promise<void>;
  /** Mails to `to` since the scenario started (waits up to `timeoutMs`). */
  mailsTo(to: string, timeoutMs?: number): Promise<SentMail[]>;
}

export function backendName(
  env: Readonly<Record<string, string | undefined>> = process.env,
): BackendName {
  const name = env.NUXT_SHOP_BITE_BACKEND || "shopware";
  if (name !== "memory" && name !== "shopware") {
    throw new Error(`No behaviour test driver for backend "${name}".`);
  }
  return name;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function poll<T>(
  read: () => Promise<T[]>,
  timeoutMs: number,
): Promise<T[]> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const found = await read();
    if (found.length || Date.now() >= until) return found;
    await sleep(500);
  }
}

// --- memory ----------------------------------------------------------------

function memoryBackend(request: APIRequestContext): Backend {
  const send = async (
    method: "POST" | "PATCH",
    scenario: RestaurantScenario,
  ) => {
    const response = await request.fetch("/api/_test/scenario", {
      method,
      data: {
        ...(scenario.hours && { openingHours: MEMORY_HOURS[scenario.hours] }),
        ...(scenario.acceptsOrders !== undefined && {
          acceptsOrders: scenario.acceptsOrders,
        }),
      },
    });
    if (response.status() === 404) {
      throw new Error(
        "The storefront has no test seam: build it with SHOPBITE_TEST_SEAMS=1 and run it with NUXT_SHOP_BITE_BACKEND=memory (CLAUDE.md, Behaviour tests).",
      );
    }
    if (!response.ok()) {
      throw new Error(
        `${method} /api/_test/scenario: HTTP ${response.status()} ${await response.text()}`,
      );
    }
  };
  return {
    name: "memory",
    start: (scenario = {}) => send("POST", scenario),
    change: (scenario) => send("PATCH", scenario),
    finish: async () => {},
    mailsTo: (to, timeoutMs = 2000) =>
      poll(async () => {
        const response = await request.get("/api/_test/mails");
        const { mails } = (await response.json()) as {
          mails: { to: string; url: string }[];
        };
        return mails
          .filter((mail) => mail.to.toLowerCase() === to.toLowerCase())
          .map((mail) => ({ to: mail.to, links: [mail.url] }));
      }, timeoutMs),
  };
}

// --- shopware ----------------------------------------------------------------

const ORDERING_OPEN = "ShopBitePlugin.config.isCheckoutEnabled";
const CHANNEL_NAME = process.env.BDD_SALES_CHANNEL ?? "ShopBite";
/**
 * The quickstart's hours, every day 00:00–23:59 (Berlin time), and hours
 * that are over for today whenever the suite runs: 00:00–00:01.
 */
const SHOPWARE_HOURS = {
  open: { from: "00:00", to: "23:59" },
  "closed-for-today": { from: "00:00", to: "00:01" },
};

function shopwareBackend(request: APIRequestContext): Backend {
  const shopware = process.env.BDD_SHOPWARE_URL ?? "http://localhost:8000";
  const mailpit = process.env.BDD_MAILPIT_URL ?? "http://localhost:8025";
  const purgeSecret = process.env.NUXT_CACHE_PURGE_SECRET;
  let bearer: string | undefined;
  let channelId: string | undefined;

  async function admin(method: string, path: string, data?: unknown) {
    if (!bearer) {
      const response = await request.post(`${shopware}/api/oauth/token`, {
        data: {
          grant_type: "password",
          client_id: "administration",
          scope: "write",
          username: process.env.BDD_ADMIN_USER ?? "admin",
          password: process.env.BDD_ADMIN_PASSWORD ?? "shopbite",
        },
      });
      if (!response.ok()) {
        throw new Error(`Admin API login: HTTP ${response.status()}`);
      }
      bearer = (await response.json()).access_token;
    }
    const response = await request.fetch(`${shopware}/api${path}`, {
      method,
      data,
      headers: {
        authorization: `Bearer ${bearer}`,
        accept: "application/json",
      },
    });
    if (!response.ok()) {
      throw new Error(
        `${method} ${path}: HTTP ${response.status()} ${(await response.text()).slice(0, 300)}`,
      );
    }
    return response.status() === 204 ? null : response.json();
  }

  async function channel(): Promise<string> {
    if (channelId) return channelId;
    const found = await admin("POST", "/search/sales-channel", {
      filter: [{ type: "equals", field: "name", value: CHANNEL_NAME }],
    });
    channelId = found.data[0]?.id;
    if (!channelId) {
      throw new Error(
        `No sales channel "${CHANNEL_NAME}": did the quickstart setup run?`,
      );
    }
    return channelId;
  }

  async function setHours(hours: { from: string; to: string }) {
    const id = await channel();
    const current = await admin("POST", "/search/shopbite-business-hour", {
      filter: [{ type: "equals", field: "salesChannelId", value: id }],
    });
    const { from, to } = hours;
    await admin("POST", "/_action/sync", [
      {
        action: "upsert",
        entity: "shopbite_business_hour",
        payload: current.data.map((hour: Record<string, unknown>) => ({
          id: hour.id,
          salesChannelId: hour.salesChannelId,
          dayOfWeek: hour.dayOfWeek,
          openingTime: from,
          closingTime: to,
        })),
      },
    ]);
  }

  async function setRestaurant(scenario: RestaurantScenario) {
    if (scenario.hours) await setHours(SHOPWARE_HOURS[scenario.hours]);
    if (scenario.acceptsOrders !== undefined) {
      await admin("POST", "/_action/system-config/batch", {
        [await channel()]: { [ORDERING_OPEN]: scenario.acceptsOrders },
      });
    }
    // the storefront caches the layout data (hours, switch) for a minute
    if (purgeSecret) {
      const response = await request.post("/api/_cache/purge", {
        headers: { authorization: `Bearer ${purgeSecret}` },
        data: { layout: true },
      });
      if (!response.ok()) {
        throw new Error(`cache purge: HTTP ${response.status()}`);
      }
    }
  }

  const open = { hours: "open", acceptsOrders: true } as const;
  return {
    name: "shopware",
    async start(scenario = {}) {
      await setRestaurant({ ...open, ...scenario });
    },
    change: setRestaurant,
    finish: () => setRestaurant(open),
    mailsTo: (to, timeoutMs = 30_000) =>
      poll(async () => {
        const response = await request.get(
          `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages } = (await response.json()) as {
          messages: { ID: string }[];
        };
        return Promise.all(
          messages.map(async ({ ID }) => {
            const message = await (
              await request.get(`${mailpit}/api/v1/message/${ID}`)
            ).json();
            const links = [
              ...new Set(
                String(message.Text ?? "").match(/https?:\/\/[^\s"<>]+/g) ?? [],
              ),
            ];
            return { to, links };
          }),
        );
      }, timeoutMs),
  };
}

export function createBackend(
  name: BackendName,
  request: APIRequestContext,
): Backend {
  return name === "memory" ? memoryBackend(request) : shopwareBackend(request);
}
