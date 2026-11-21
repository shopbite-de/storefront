import { describe, expect, it } from "vitest";
import { createShopwareBackend } from "../../../server/adapters/shopware";
import { isDomainError } from "../../../shared/domain";
import { testSession } from "../../contract/cart.contract";
import { REGISTRATION, SECOND_ADDRESS } from "../../contract/customer.contract";
import { fakeShopwareAccounts } from "../../contract/customerFixtures";
import { RESTAURANT, STOREFRONT_URL } from "../../contract/ordering.contract";
import { GERMANY } from "../../contract/orderingFixtures";

/**
 * What Shopware sends that the customer contract cannot express: the
 * requests the adapter makes (login with the visitor's token, the address
 * chain for the per-IP limits, the recovery link on a sales channel
 * domain), the retry time of a rate limit, and errors without passwords.
 */
function setup() {
  const fake = fakeShopwareAccounts(RESTAURANT);
  const backend = createShopwareBackend({
    storeApi: fake.storeApi,
    visitorApi: fake.visitorApi,
    countryId: GERMANY,
    storeUrl: "https://shop.example.com",
    timeZone: "Europe/Berlin",
    log: () => {},
  });
  return { fake, backend };
}

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

describe("Shopware customer adapter", () => {
  it("logs in with the visitor's token, so Shopware merges the cart", async () => {
    const { fake, backend } = setup();
    await backend.customer.register(
      testSession(),
      REGISTRATION,
      STOREFRONT_URL,
    );
    const session = Object.assign(testSession("visitor-token"), {
      forwardedFor: "203.0.113.7, 10.0.0.5",
    });
    await backend.customer.login(
      session,
      REGISTRATION.email,
      REGISTRATION.password,
    );
    const login = fake.requests.find(
      (entry) => entry.path === "/account/login",
    );
    expect(login).toMatchObject({
      method: "POST",
      contextToken: "visitor-token",
      forwardedFor: "203.0.113.7, 10.0.0.5",
      body: { email: REGISTRATION.email, password: REGISTRATION.password },
    });
    expect(session.state()).not.toBe("visitor-token");
  });

  it("keeps the password out of the error and its cause", async () => {
    const { backend } = setup();
    await backend.customer.register(
      testSession(),
      REGISTRATION,
      STOREFRONT_URL,
    );
    const secret = "very-secret-wrong-password";
    const error = await failure(() =>
      backend.customer.login(testSession(), REGISTRATION.email, secret),
    );
    expect(isDomainError(error, "invalid_credentials")).toBe(true);
    const everything = JSON.stringify({
      message: error.message,
      details: error.details,
      cause: String((error as { cause?: unknown }).cause),
      causeMessage: ((error as { cause?: Error }).cause as Error)?.message,
    });
    expect(everything).not.toContain(secret);
    expect(everything).not.toContain(REGISTRATION.email);
  });

  it("reports how long Shopware holds back further logins", async () => {
    const { backend } = setup();
    await backend.customer.register(
      testSession(),
      REGISTRATION,
      STOREFRONT_URL,
    );
    let last: Awaited<ReturnType<typeof failure>> | undefined;
    for (let attempt = 0; attempt < 11; attempt++) {
      last = await failure(() =>
        backend.customer.login(testSession(), REGISTRATION.email, "wrong-one"),
      );
    }
    expect(last?.code).toBe("rate_limited");
    expect(last?.details).toEqual({ retryAfterSeconds: 10 });
  });

  it("asks for a reset link with the visitor's address, on a sales channel domain", async () => {
    const { fake, backend } = setup();
    const session = Object.assign(testSession(), {
      forwardedFor: "203.0.113.7",
    });
    await backend.customer.requestPasswordReset(
      session,
      "nobody@example.com",
      "https://shop.example.com/",
    );
    const request = fake.requests.find(
      (entry) => entry.path === "/account/recovery-password",
    );
    expect(request?.body).toEqual({
      email: "nobody@example.com",
      storefrontUrl: "https://shop.example.com",
    });
    // no visitor session is created for it
    expect(session.state()).toBeUndefined();
  });

  it("keeps the country and salutation of an address a change does not name", async () => {
    const { fake, backend } = setup();
    const session = testSession();
    await backend.customer.register(session, REGISTRATION, STOREFRONT_URL);
    const created = await backend.customer.saveAddress(session, {
      ...SECOND_ADDRESS,
      country: "DE",
    });
    await backend.customer.saveAddress(session, {
      ...SECOND_ADDRESS,
      id: created.id,
      country: null,
      salutation: null,
    });
    const patch = fake.requests.find(
      (entry) =>
        entry.method === "PATCH" &&
        entry.path === `/account/address/${created.id}`,
    );
    expect(patch?.body).not.toHaveProperty("countryId");
    expect(patch?.body).not.toHaveProperty("salutationId");
  });
});
