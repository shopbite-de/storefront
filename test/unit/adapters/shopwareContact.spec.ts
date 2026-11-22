import { describe, expect, it, vi } from "vitest";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../../server/adapters/shopware";
import { isDomainError } from "../../../shared/domain";
import { MESSAGE } from "../../contract/contact.contract";

const NOT_SPECIFIED = "0191c12dd4b970949e8e6ba4d5fc80c6";

/**
 * What the contact contract cannot express: the request of the 2.x form
 * (salutation "not given", empty strings for empty fields, `comment`), the
 * visitor's address chain as a header, Shopware's refusals as codes.
 */
function setup(contactForm: (body: Record<string, unknown>) => unknown) {
  const post = vi.fn(
    async (
      path: string,
      body: Record<string, unknown>,
      _options?: { headers?: Record<string, string> },
    ) => {
      if (path === "/salutation") {
        return {
          elements: [
            { id: "id-mr", salutationKey: "mr" },
            { id: NOT_SPECIFIED, salutationKey: "not_specified" },
          ],
        };
      }
      if (path === "/contact-form") return contactForm(body);
      throw new Error(`unexpected POST ${path}`);
    },
  );
  const storeApi: StoreApi = {
    get: () => Promise.reject(new Error("no GET")),
    post: post as StoreApi["post"],
  };
  const backend = createShopwareBackend({
    storeApi,
    storeUrl: "https://shop.example.com",
    timeZone: "Europe/Berlin",
    log: () => {},
    requestTimeoutMs: 50,
  });
  return { contact: backend.contact, post };
}

const refused = (status: number, code: string, extra: object = {}) =>
  Object.assign(new Error(`${status}`), {
    statusCode: status,
    data: { errors: [{ status: String(status), code, ...extra }] },
  });

async function failure(call: () => Promise<unknown>) {
  try {
    await call();
  } catch (error) {
    return error as Error & {
      code?: string;
      details?: Record<string, unknown>;
    };
  }
  throw new Error("expected the call to fail");
}

describe("Shopware ContactPort adapter (anti-corruption)", () => {
  it("sends the request of the 2.x contact form", async () => {
    const { contact, post } = setup(() => ({ individualSuccessMessage: "" }));

    await contact.send(
      { ...MESSAGE, firstName: null, lastName: null, phone: null },
      { forwardedFor: "203.0.113.7, 10.0.0.2" },
    );

    const [, body, options] = post.mock.calls.find(
      ([path]) => path === "/contact-form",
    )!;
    expect(body).toEqual({
      salutationId: NOT_SPECIFIED,
      firstName: "",
      lastName: "",
      email: MESSAGE.email,
      phone: "",
      subject: MESSAGE.subject,
      comment: MESSAGE.message,
    });
    expect(options).toEqual({
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.2" },
    });
  });

  it("reads the salutations once a while", async () => {
    const { contact, post } = setup(() => ({}));
    await contact.send(MESSAGE, {});
    await contact.send(MESSAGE, {});
    expect(
      post.mock.calls.filter(([path]) => path === "/salutation"),
    ).toHaveLength(1);
    // without an address chain no header
    expect(
      post.mock.calls.find(([path]) => path === "/contact-form")![2],
    ).toBeUndefined();
  });

  it("answers the restaurant's text trimmed, else null", async () => {
    expect(
      await setup(() => ({
        individualSuccessMessage: "  Danke!  ",
      })).contact.send(MESSAGE, {}),
    ).toEqual({ confirmation: "Danke!" });
    expect(
      await setup(() => ({ individualSuccessMessage: "   " })).contact.send(
        MESSAGE,
        {},
      ),
    ).toEqual({ confirmation: null });
  });

  it("answers Shopware's limit with the seconds to wait", async () => {
    const { contact } = setup(() => {
      throw refused(429, "FRAMEWORK__RATE_LIMIT_EXCEEDED", {
        meta: { parameters: { seconds: 27 } },
      });
    });
    const error = await failure(() => contact.send(MESSAGE, {}));
    expect(isDomainError(error, "rate_limited")).toBe(true);
    expect(error.details).toEqual({ retryAfterSeconds: 27 });
  });

  it("answers a refused field by the domain's name", async () => {
    // Shopware refuses a web address as a name
    const { contact } = setup(() => {
      throw refused(400, "VIOLATION::REGEX_FAILED_ERROR", {
        source: { pointer: "/firstName" },
      });
    });
    const error = await failure(() => contact.send(MESSAGE, {}));
    expect(isDomainError(error, "validation_failed")).toBe(true);
    expect(error.details).toEqual({ fields: ["firstName"] });
  });

  it("gives up after its deadline", async () => {
    const { contact } = setup(() => new Promise(() => {}));
    const error = await failure(() => contact.send(MESSAGE, {}));
    expect(isDomainError(error, "backend_unavailable")).toBe(true);
  });
});
