import { describe, expect, it } from "vitest";
import {
  dishConfiguration,
  isDomainError,
  type Address,
  type DomainErrorCode,
} from "../../shared/domain";
import type {
  AccountAddress,
  Backend,
  BackendSession,
  Registration,
} from "../../server/ports";
import { COLA, MARGHERITA, SALAMI, LARGE, testSession } from "./cart.contract";
import {
  GUEST,
  RESTAURANT,
  STOREFRONT_URL,
  WISHED,
  type OrderingScenario,
} from "./ordering.contract";

/**
 * Guest & Account (ADR 0001, step 6): the customer's account on one
 * backend together with cart, checkout and orders, since login merges the
 * visitor's cart into the customer's and a customer orders with the
 * account's addresses.
 */
export type CustomerScenario = OrderingScenario &
  Readonly<{
    /** The shop asks new customers to confirm their e-mail first. */
    doubleOptIn?: boolean;
  }>;

/** What the backend sent by e-mail, with the secret of its link. */
export type SentMail =
  | Readonly<{
      to: string;
      kind: "registration";
      /** The link's parameters, as `confirmRegistration` takes them. */
      confirmation: Readonly<Record<string, string>>;
    }>
  | Readonly<{ to: string; kind: "password_reset"; resetToken: string }>;

export type CustomerFixture = Readonly<{
  adapter: string;
  create: (scenario: CustomerScenario) => {
    backend: Backend;
    mails: () => readonly SentMail[];
  };
}>;

const PASSWORD = "geheim-123";

export const REGISTRATION: Registration = {
  ...GUEST,
  email: "erika@example.com",
  firstName: "Erika",
  lastName: "Muster",
  // the form sends no names of its own: the billing address takes the customer's
  billingAddress: { ...GUEST.billingAddress, firstName: "", lastName: "" },
  password: PASSWORD,
};

const OTHER: Registration = {
  ...REGISTRATION,
  email: "otto@example.com",
  firstName: "Otto",
  lastName: "Normal",
};

export const SECOND_ADDRESS: AccountAddress = {
  id: null,
  salutation: null,
  firstName: "Erika",
  lastName: "Muster",
  company: null,
  department: null,
  street: "Nebenweg 7",
  additionalLine: "Hinterhaus",
  postalCode: "54321",
  city: "Anderswo",
  country: null,
  phone: "0987654321",
};

async function rejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

async function code(call: () => Promise<unknown>): Promise<DomainErrorCode> {
  const error = await rejection(call);
  if (!isDomainError(error)) throw error;
  return error.code;
}

const cartSummary = async (backend: Backend, session: BackendSession) =>
  (await backend.cart.getCart(session)).lines
    .map((line) => `${line.dishNumber}x${line.quantity}`)
    .sort();

const addressLines = (address: Address) => ({
  name: `${address.firstName} ${address.lastName}`,
  street: address.street,
  additionalLine: address.additionalLine,
  city: `${address.postalCode} ${address.city}`,
  country: address.country,
  phone: address.phone,
});

export function runCustomerContract(
  fixtures: readonly CustomerFixture[],
): void {
  for (const fixture of fixtures) {
    describe(`customer contract [${fixture.adapter}]`, () => {
      customerSuite((scenario = RESTAURANT) => fixture.create(scenario));
    });
  }
}

function customerSuite(
  given: (scenario?: CustomerScenario) => {
    backend: Backend;
    mails: () => readonly SentMail[];
  },
): void {
  /** A logged-in customer of a new account and its session. */
  async function customer(
    backend: Backend,
    registration: Registration = REGISTRATION,
  ) {
    const session = testSession();
    await backend.customer.register(session, registration, STOREFRONT_URL);
    return session;
  }

  describe("visitor", () => {
    it("has no customer without a session, and gets none", async () => {
      const { backend } = given();
      const session = testSession();
      expect(await backend.customer.getCustomer(session)).toBeNull();
      expect(session.state()).toBeUndefined();
    });

    it("has no customer with a cart only", async () => {
      const { backend } = given();
      const session = testSession();
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      expect(await backend.customer.getCustomer(session)).toBeNull();
    });

    it("knows the guest of the session as a guest", async () => {
      const { backend } = given();
      const session = testSession();
      await backend.checkout.registerGuest(session, GUEST, STOREFRONT_URL);
      expect(await backend.customer.getCustomer(session)).toMatchObject({
        guest: true,
        email: GUEST.email,
      });
    });

    it("needs a logged-in customer for the account", async () => {
      const { backend } = given();
      const session = testSession();
      const calls: (() => Promise<unknown>)[] = [
        () => backend.customer.listAddresses(session),
        () => backend.customer.saveAddress(session, SECOND_ADDRESS),
        () => backend.customer.deleteAddress(session, "a1"),
        () => backend.customer.setDefaultAddress(session, "a1", "billing"),
        () =>
          backend.customer.updateProfile(session, {
            salutation: null,
            firstName: "A",
            lastName: "B",
          }),
        () => backend.customer.changeEmail(session, "a@example.com", PASSWORD),
        () => backend.customer.changePassword(session, PASSWORD, "neu-12345"),
        () => backend.customer.deleteAccount(session),
      ];
      for (const call of calls) {
        expect(await code(call)).toBe("unauthenticated");
      }
    });

    it("lists the countries of the shop", async () => {
      const { backend } = given();
      const countries = await backend.customer.listCountries();
      expect(countries.map((country) => country.code)).toContain("DE");
      expect(countries.every((country) => country.name.length > 0)).toBe(true);
    });
  });

  describe("registration", () => {
    it("creates the account and logs the session in", async () => {
      const { backend } = given();
      const session = testSession();
      const before = session.state();
      const result = await backend.customer.register(
        session,
        REGISTRATION,
        STOREFRONT_URL,
      );
      expect(result.confirmationRequired).toBe(false);
      expect(result.customer).toMatchObject({
        guest: false,
        email: REGISTRATION.email,
        firstName: "Erika",
        lastName: "Muster",
      });
      expect(session.state()).toBeDefined();
      expect(session.state()).not.toBe(before);
      const current = await backend.customer.getCustomer(session);
      expect(current).toEqual(result.customer);
      const addresses = await backend.customer.listAddresses(session);
      expect(addresses.map(addressLines)).toEqual([
        {
          name: "Erika Muster",
          street: "Musterstraße 1",
          additionalLine: null,
          city: "12345 Musterstadt",
          country: "DE",
          phone: "0123456789",
        },
      ]);
      expect(current?.defaultBillingAddressId).toBe(addresses[0]!.id);
      expect(current?.defaultDeliveryAddressId).toBe(addresses[0]!.id);
    });

    it("keeps the salutation the customer chose", async () => {
      const { backend } = given();
      const { customer } = await backend.customer.register(
        testSession(),
        { ...REGISTRATION, salutation: "mrs" },
        STOREFRONT_URL,
      );
      expect(customer.salutation).toBe("mrs");
    });

    it("keeps a separate delivery address", async () => {
      const { backend } = given();
      const session = testSession();
      const { customer } = await backend.customer.register(
        session,
        {
          ...REGISTRATION,
          deliveryAddress: { ...SECOND_ADDRESS, country: null },
        },
        STOREFRONT_URL,
      );
      const addresses = await backend.customer.listAddresses(session);
      const byId = new Map(addresses.map((entry) => [entry.id, entry]));
      expect(byId.get(customer.defaultBillingAddressId!)?.street).toBe(
        "Musterstraße 1",
      );
      expect(byId.get(customer.defaultDeliveryAddressId!)?.street).toBe(
        "Nebenweg 7",
      );
    });

    it("refuses an e-mail that has an account", async () => {
      const { backend } = given();
      await customer(backend);
      expect(
        await code(() =>
          backend.customer.register(
            testSession(),
            { ...OTHER, email: REGISTRATION.email },
            STOREFRONT_URL,
          ),
        ),
      ).toBe("email_taken");
    });

    it("keeps the visitor's cart", async () => {
      const { backend } = given();
      const session = testSession();
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        2,
      );
      await backend.customer.register(session, REGISTRATION, STOREFRONT_URL);
      expect(await cartSummary(backend, session)).toEqual(["80x2"]);
    });

    it("asks for the confirmation of the e-mail with double opt-in", async () => {
      const { backend, mails } = given({ ...RESTAURANT, doubleOptIn: true });
      const session = testSession();
      const result = await backend.customer.register(
        session,
        REGISTRATION,
        STOREFRONT_URL,
      );
      expect(result.confirmationRequired).toBe(true);
      expect(result.customer.email).toBe(REGISTRATION.email);
      expect(await backend.customer.getCustomer(session)).toBeNull();
      expect(
        await code(() =>
          backend.customer.login(testSession(), REGISTRATION.email, PASSWORD),
        ),
      ).toBe("account_not_confirmed");
      expect(
        await code(() =>
          backend.customer.login(
            testSession(),
            REGISTRATION.email,
            "wrong-password",
          ),
        ),
      ).toBe("invalid_credentials");

      const mail = mails().find((entry) => entry.kind === "registration");
      expect(mail?.to).toBe(REGISTRATION.email);
      const confirming = testSession();
      const confirmed = await backend.customer.confirmRegistration(
        confirming,
        mail!.kind === "registration" ? mail!.confirmation : {},
      );
      expect(confirmed).toMatchObject({
        guest: false,
        email: REGISTRATION.email,
      });
      expect(await backend.customer.getCustomer(confirming)).toMatchObject({
        email: REGISTRATION.email,
      });
      expect(
        await code(() =>
          backend.customer.confirmRegistration(
            testSession(),
            mail!.kind === "registration" ? mail!.confirmation : {},
          ),
        ),
      ).toBe("already_confirmed");
      expect(
        await backend.customer.login(
          testSession(),
          REGISTRATION.email,
          PASSWORD,
        ),
      ).toMatchObject({ email: REGISTRATION.email });
    });

    it("refuses a broken confirmation link", async () => {
      const { backend } = given({ ...RESTAURANT, doubleOptIn: true });
      await backend.customer.register(
        testSession(),
        REGISTRATION,
        STOREFRONT_URL,
      );
      expect(
        await code(() =>
          backend.customer.confirmRegistration(testSession(), {
            em: "nothing",
            hash: "nothing",
          }),
        ),
      ).toBe("not_found");
    });
  });

  describe("login and logout", () => {
    it("logs in with e-mail and password and replaces the session state", async () => {
      const { backend } = given();
      const registered = await customer(backend);
      await backend.customer.logout(registered);
      const session = testSession();
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      const before = session.state();
      const logged = await backend.customer.login(
        session,
        REGISTRATION.email,
        PASSWORD,
      );
      expect(logged).toMatchObject({ guest: false, email: REGISTRATION.email });
      expect(session.state()).not.toBe(before);
      // the state before the login never opens the account
      const replayed = testSession(before);
      expect(await backend.customer.getCustomer(replayed)).toBeNull();
      expect(await cartSummary(backend, replayed)).toEqual([]);
    });

    it("answers a wrong password and an unknown e-mail alike", async () => {
      const { backend } = given();
      await customer(backend);
      expect(
        await code(() =>
          backend.customer.login(
            testSession(),
            REGISTRATION.email,
            "wrong-password",
          ),
        ),
      ).toBe("invalid_credentials");
      expect(
        await code(() =>
          backend.customer.login(testSession(), "nobody@example.com", PASSWORD),
        ),
      ).toBe("invalid_credentials");
    });

    it("limits failed logins per e-mail and visitor address", async () => {
      const { backend } = given();
      await customer(backend);
      const from = (address: string) =>
        Object.assign(testSession(), { forwardedFor: address });
      const codes: DomainErrorCode[] = [];
      for (let attempt = 0; attempt < 12; attempt++) {
        codes.push(
          await code(() =>
            backend.customer.login(
              from("203.0.113.7"),
              REGISTRATION.email,
              "wrong-password",
            ),
          ),
        );
      }
      expect(
        codes.slice(0, 10).every((entry) => entry === "invalid_credentials"),
      ).toBe(true);
      expect(codes.at(-1)).toBe("rate_limited");
      // another visitor is not held back
      expect(
        await code(() =>
          backend.customer.login(
            from("203.0.113.99"),
            REGISTRATION.email,
            "wrong-password",
          ),
        ),
      ).toBe("invalid_credentials");
    });

    it("merges the visitor's cart into the customer's on login", async () => {
      const { backend } = given();
      const first = await customer(backend);
      await backend.cart.addLine(first, dishConfiguration({ dishId: COLA }), 1);
      await backend.cart.addLine(
        first,
        dishConfiguration({ dishId: SALAMI, variantId: LARGE }),
        1,
      );
      await backend.customer.logout(first);
      expect(await cartSummary(backend, first)).toEqual([]);

      const visitor = testSession();
      await backend.cart.addLine(
        visitor,
        dishConfiguration({ dishId: COLA }),
        2,
      );
      await backend.cart.addLine(
        visitor,
        dishConfiguration({ dishId: MARGHERITA }),
        1,
      );
      await backend.customer.login(visitor, REGISTRATION.email, PASSWORD);
      expect(await cartSummary(backend, visitor)).toEqual([
        "21x1",
        "22Gx1",
        "80x3",
      ]);
    });

    it("logs out: the session is a visitor's, the old state opens nothing", async () => {
      const { backend } = given();
      const session = await customer(backend);
      const loggedIn = session.state();
      await backend.customer.logout(session);
      expect(session.state()).not.toBe(loggedIn);
      expect(await backend.customer.getCustomer(session)).toBeNull();
      const replayed = testSession(loggedIn);
      expect(await backend.customer.getCustomer(replayed)).toBeNull();
      expect(await code(() => backend.customer.listAddresses(replayed))).toBe(
        "unauthenticated",
      );
    });
  });

  describe("profile", () => {
    it("changes the names", async () => {
      const { backend } = given();
      const session = await customer(backend);
      const changed = await backend.customer.updateProfile(session, {
        salutation: "mrs",
        firstName: "Erika Maria",
        lastName: "Musterfrau",
      });
      expect(changed).toMatchObject({
        salutation: "mrs",
        firstName: "Erika Maria",
        lastName: "Musterfrau",
      });
      expect(await backend.customer.getCustomer(session)).toEqual(changed);
    });

    it("changes the e-mail with the password", async () => {
      const { backend } = given();
      await customer(backend, OTHER);
      const session = await customer(backend);
      expect(
        await code(() =>
          backend.customer.changeEmail(
            session,
            "erika.neu@example.com",
            "wrong-password",
          ),
        ),
      ).toBe("invalid_credentials");
      expect(
        await code(() =>
          backend.customer.changeEmail(session, OTHER.email, PASSWORD),
        ),
      ).toBe("email_taken");
      const changed = await backend.customer.changeEmail(
        session,
        "erika.neu@example.com",
        PASSWORD,
      );
      expect(changed.email).toBe("erika.neu@example.com");
      await backend.customer.logout(session);
      expect(
        await backend.customer.login(
          testSession(),
          "erika.neu@example.com",
          PASSWORD,
        ),
      ).toMatchObject({ email: "erika.neu@example.com" });
    });

    it("changes the password with the current one", async () => {
      const { backend } = given();
      const session = await customer(backend);
      expect(
        await code(() =>
          backend.customer.changePassword(
            session,
            "wrong-password",
            "neues-geheim-1",
          ),
        ),
      ).toBe("invalid_credentials");
      expect(
        await backend.customer.changePassword(
          session,
          PASSWORD,
          "neues-geheim-1",
        ),
      ).toEqual({ loggedIn: true });
      // the customer who changed it stays logged in
      expect(await backend.customer.getCustomer(session)).toMatchObject({
        email: REGISTRATION.email,
      });
      expect(
        await code(() =>
          backend.customer.login(testSession(), REGISTRATION.email, PASSWORD),
        ),
      ).toBe("invalid_credentials");
      expect(
        await backend.customer.login(
          testSession(),
          REGISTRATION.email,
          "neues-geheim-1",
        ),
      ).toMatchObject({ email: REGISTRATION.email });
    });

    it("deletes the account", async () => {
      const { backend } = given();
      const session = await customer(backend);
      await backend.customer.deleteAccount(session);
      expect(await backend.customer.getCustomer(session)).toBeNull();
      expect(
        await code(() =>
          backend.customer.login(testSession(), REGISTRATION.email, PASSWORD),
        ),
      ).toBe("invalid_credentials");
    });
  });

  describe("password reset", () => {
    it("sends a link for a known e-mail and answers an unknown one the same", async () => {
      const { backend, mails } = given();
      await customer(backend);
      await expect(
        backend.customer.requestPasswordReset(
          testSession(),
          "nobody@example.com",
          STOREFRONT_URL,
        ),
      ).resolves.toBeUndefined();
      expect(mails().filter((mail) => mail.kind === "password_reset")).toEqual(
        [],
      );
      await backend.customer.requestPasswordReset(
        testSession(),
        REGISTRATION.email,
        STOREFRONT_URL,
      );
      const mail = mails().find((entry) => entry.kind === "password_reset");
      expect(mail?.to).toBe(REGISTRATION.email);
      const token = mail!.kind === "password_reset" ? mail!.resetToken : "";
      await backend.customer.resetPassword(
        testSession(),
        token,
        "neues-geheim-2",
      );
      expect(
        await backend.customer.login(
          testSession(),
          REGISTRATION.email,
          "neues-geheim-2",
        ),
      ).toMatchObject({ email: REGISTRATION.email });
      expect(
        await code(() =>
          backend.customer.resetPassword(testSession(), token, "noch-eins-3"),
        ),
      ).toBe("not_found");
    });

    it("refuses an unknown token", async () => {
      const { backend } = given();
      expect(
        await code(() =>
          backend.customer.resetPassword(
            testSession(),
            "no-such-token",
            "neues-geheim-2",
          ),
        ),
      ).toBe("not_found");
    });
  });

  describe("addresses", () => {
    it("creates and changes addresses of the account", async () => {
      const { backend } = given();
      const session = await customer(backend);
      const created = await backend.customer.saveAddress(
        session,
        SECOND_ADDRESS,
      );
      expect(created.id).toBeTruthy();
      expect(addressLines(created)).toEqual({
        name: "Erika Muster",
        street: "Nebenweg 7",
        additionalLine: "Hinterhaus",
        city: "54321 Anderswo",
        country: "DE",
        phone: "0987654321",
      });
      const changed = await backend.customer.saveAddress(session, {
        ...SECOND_ADDRESS,
        id: created.id,
        street: "Nebenweg 9",
        additionalLine: null,
      });
      expect(changed.id).toBe(created.id);
      expect(changed.street).toBe("Nebenweg 9");
      expect(changed.additionalLine).toBeNull();
      expect(changed.country).toBe("DE");
      const listed = await backend.customer.listAddresses(session);
      expect(listed.map((entry) => entry.street).sort()).toEqual([
        "Musterstraße 1",
        "Nebenweg 9",
      ]);
    });

    it("sets the default billing and delivery address", async () => {
      const { backend } = given();
      const session = await customer(backend);
      const created = await backend.customer.saveAddress(
        session,
        SECOND_ADDRESS,
      );
      const delivery = await backend.customer.setDefaultAddress(
        session,
        created.id!,
        "delivery",
      );
      expect(delivery.defaultDeliveryAddressId).toBe(created.id);
      expect(delivery.defaultBillingAddressId).not.toBe(created.id);
      const billing = await backend.customer.setDefaultAddress(
        session,
        created.id!,
        "billing",
      );
      expect(billing.defaultBillingAddressId).toBe(created.id);
      // the checkout orders with the account's defaults
      const orderer = await backend.checkout.getOrderer(session);
      expect(orderer?.deliveryAddress.street).toBe("Nebenweg 7");
      expect(orderer?.billingAddress.street).toBe("Nebenweg 7");
      expect(orderer?.customer.guest).toBe(false);
    });

    it("deletes an address but not a default one", async () => {
      const { backend } = given();
      const session = await customer(backend);
      const customerNow = (await backend.customer.getCustomer(session))!;
      expect(
        await code(() =>
          backend.customer.deleteAddress(
            session,
            customerNow.defaultBillingAddressId!,
          ),
        ),
      ).toBe("address_in_use");
      const created = await backend.customer.saveAddress(
        session,
        SECOND_ADDRESS,
      );
      await backend.customer.deleteAddress(session, created.id!);
      expect(
        (await backend.customer.listAddresses(session)).map(
          (entry) => entry.id,
        ),
      ).toEqual([customerNow.defaultBillingAddressId]);
    });

    it("never reads or writes another customer's address", async () => {
      const { backend } = given();
      const owner = await customer(backend);
      const own = await backend.customer.saveAddress(owner, SECOND_ADDRESS);
      const intruder = await customer(backend, OTHER);
      expect(
        (await backend.customer.listAddresses(intruder)).map(
          (entry) => entry.id,
        ),
      ).not.toContain(own.id);
      expect(
        await code(() =>
          backend.customer.saveAddress(intruder, {
            ...SECOND_ADDRESS,
            id: own.id,
            street: "Gestohlen 1",
          }),
        ),
      ).toBe("not_found");
      expect(
        await code(() => backend.customer.deleteAddress(intruder, own.id!)),
      ).toBe("not_found");
      expect(
        await code(() =>
          backend.customer.setDefaultAddress(intruder, own.id!, "delivery"),
        ),
      ).toBe("not_found");
      expect(
        await code(() =>
          backend.checkout.updateAddress(intruder, {
            ...SECOND_ADDRESS,
            id: own.id,
            country: "DE",
          }),
        ),
      ).toBe("not_found");
      const still = await backend.customer.listAddresses(owner);
      expect(still.find((entry) => entry.id === own.id)?.street).toBe(
        "Nebenweg 7",
      );
    });
  });

  describe("orders", () => {
    it("orders as the customer and lists the order in the account", async () => {
      const { backend } = given();
      const session = await customer(backend);
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        2,
      );
      const order = await backend.checkout.placeOrder(session, {
        wishedTime: WISHED,
        fulfillment: "delivery",
        note: null,
      });
      expect(order.email).toBe(REGISTRATION.email);
      expect(order.deliveryAddress?.street).toBe("Musterstraße 1");
      const page = await backend.orders.listOrders(session, 1, 10);
      expect(page.orders.map((entry) => entry.id)).toEqual([order.id]);

      // after a logout the order is not the visitor's; after a login again
      await backend.customer.logout(session);
      expect(await code(() => backend.orders.getOrder(session, order.id))).toBe(
        "not_found",
      );
      const again = testSession();
      await backend.customer.login(again, REGISTRATION.email, PASSWORD);
      expect((await backend.orders.getOrder(again, order.id)).id).toBe(
        order.id,
      );
      // another customer never reads it
      const other = await customer(backend, OTHER);
      expect(await code(() => backend.orders.getOrder(other, order.id))).toBe(
        "not_found",
      );
      expect((await backend.orders.listOrders(other, 1, 10)).orders).toEqual(
        [],
      );
    });
  });

  it("answers frozen values", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const current = (await backend.customer.getCustomer(session))!;
    const addresses = await backend.customer.listAddresses(session);
    expect(Object.isFrozen(current)).toBe(true);
    expect(Object.isFrozen(addresses)).toBe(true);
    expect(Object.isFrozen(addresses[0])).toBe(true);
  });
}
