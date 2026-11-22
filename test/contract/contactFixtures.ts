import {
  createMemoryBackend,
  demoSeed,
  type MemoryContactMessage,
} from "../../server/adapters/memory";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../server/adapters/shopware";
import type { Salutation } from "../../shared/domain";
import type { Json } from "./cartFixtures";
import type { ContactFixture, ReceivedMessage } from "./contact.contract";

/** The memory adapter; it keeps the messages it was given. */
export const memoryContact: ContactFixture = {
  adapter: "memory",
  create: (scenario) => {
    const received: ReceivedMessage[] = [];
    const backend = createMemoryBackend(
      { ...demoSeed(), contact: { confirmation: scenario.confirmation } },
      {
        contact: ({ message, forwardedFor }: MemoryContactMessage) =>
          received.push({ ...message, forwardedFor }),
      },
    );
    return { backend, received: () => received };
  },
};

const SALUTATIONS: Record<Salutation, string> = {
  mr: "0191c12dd4b970949e8e6ba4d64e0eaa",
  mrs: "0191c12dd4b970949e8e6ba4d6a0d7b2",
  not_specified: "0191c12dd4b970949e8e6ba4d5fc80c6",
};

/** Shopware's answer of an error, as ofetch throws it. */
const refusal = (status: number, code: string, parameters: Json = {}) =>
  Object.assign(new Error(`${status} ${code}`), {
    name: "FetchError",
    statusCode: status,
    status,
    data: { errors: [{ status: String(status), code, meta: { parameters } }] },
  });

/**
 * Shopware's `/contact-form` as 6.7 answers it (checked against the
 * quickstart): a salutation id is required, `individualSuccessMessage` is
 * the restaurant's text or empty, the limit `contact_form` lets three
 * messages per client address through within 30 seconds (the address is
 * the rightmost of `X-Forwarded-For` that Shopware does not trust; the
 * fake trusts none).
 */
export const shopwareContact: ContactFixture = {
  adapter: "shopware",
  create: (scenario) => {
    const received: ReceivedMessage[] = [];
    const sent = new Map<string, number>();
    const salutationOf = (id: unknown): Salutation | null => {
      const key = (Object.keys(SALUTATIONS) as Salutation[]).find(
        (entry) => SALUTATIONS[entry] === id,
      );
      if (!key) throw refusal(400, "VIOLATION::IS_BLANK_ERROR");
      return key === "not_specified" ? null : key;
    };
    const given = (value: unknown) =>
      typeof value === "string" && value !== "" ? value : null;
    const storeApi: StoreApi = {
      get: async <T>(path: string) => {
        throw new Error(`unexpected GET ${path}`) as T;
      },
      post: async <T>(
        path: string,
        body: Json,
        options?: { headers?: Record<string, string> },
      ) => {
        if (path === "/salutation") {
          return {
            elements: Object.entries(SALUTATIONS).map(([key, id]) => ({
              id,
              salutationKey: key,
            })),
          } as T;
        }
        if (path !== "/contact-form")
          throw new Error(`unexpected POST ${path}`);
        const forwardedFor = options?.headers?.["x-forwarded-for"];
        const client = forwardedFor?.split(",").at(-1)?.trim() ?? "storefront";
        const count = sent.get(client) ?? 0;
        if (count >= 3) {
          throw refusal(429, "FRAMEWORK__RATE_LIMIT_EXCEEDED", { seconds: 30 });
        }
        sent.set(client, count + 1);
        received.push({
          salutation: salutationOf(body.salutationId),
          firstName: given(body.firstName),
          lastName: given(body.lastName),
          email: body.email as string,
          phone: given(body.phone),
          subject: body.subject as string,
          message: body.comment as string,
          forwardedFor,
        });
        return { individualSuccessMessage: scenario.confirmation ?? "" } as T;
      },
    };
    const backend = createShopwareBackend({
      storeApi,
      storeUrl: "https://shop.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
    return { backend, received: () => received };
  },
};
