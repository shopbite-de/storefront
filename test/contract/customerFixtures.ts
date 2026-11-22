import { createHash } from "node:crypto";
import {
  createMemoryBackend,
  type MemoryMail,
} from "../../server/adapters/memory";
import { createShopwareBackend } from "../../server/adapters/shopware";
import {
  httpError,
  type FakeLine,
  type FakeStoreApiExtension,
  type Json,
} from "./cartFixtures";
import type {
  CustomerFixture,
  CustomerScenario,
  SentMail,
} from "./customer.contract";
import {
  fakeShopwareOrdering,
  GERMANY,
  memoryOrderingSeed,
  type FakeAddress,
  type FakeCustomer,
} from "./orderingFixtures";

/** The memory adapter with the scenario's restaurant and its mails. */
export const memoryCustomer: CustomerFixture = {
  adapter: "memory",
  create: (scenario) => {
    const sent: SentMail[] = [];
    const backend = createMemoryBackend(
      {
        ...memoryOrderingSeed(scenario),
        customer: { doubleOptIn: scenario.doubleOptIn },
      },
      {
        mail: (mail: MemoryMail) =>
          sent.push(
            mail.kind === "registration"
              ? {
                  to: mail.to,
                  kind: mail.kind,
                  confirmation: mail.confirmation,
                }
              : { to: mail.to, kind: mail.kind, resetToken: mail.resetToken },
          ),
      },
    );
    return { backend, mails: () => sent };
  },
};

/* ------------------------------------------------------------------ */
/* Shopware: the ordering fake plus the account routes                 */
/* ------------------------------------------------------------------ */

type FakeAccount = FakeCustomer & {
  guest: false;
  password: string;
  active: boolean;
  doubleOptIn: boolean;
  /** ISO date-time once the double opt-in link was confirmed. */
  confirmedAt: string | null;
  confirmHash: string | null;
  addresses: FakeAddress[];
};

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");

/** A Shopware error answer with a field pointer and parameters. */
const violation = (
  status: number,
  code: string,
  pointer?: string,
  parameters: Json = {},
) =>
  Object.assign(new Error(`${status} ${code}`), {
    name: "FetchError",
    statusCode: status,
    status,
    data: {
      errors: [
        {
          status: String(status),
          code,
          ...(pointer ? { source: { pointer } } : {}),
          meta: { parameters },
        },
      ],
    },
  });

/**
 * The Store API's account routes as Shopware 6.7 answers them (checked
 * against the quickstart): login, logout, registration and its
 * confirmation, the password change and the deletion issue a new context
 * token and the old one opens nothing; login merges the visitor's cart
 * into the customer's saved one (quantities add up), logout leaves an
 * empty cart; ten failed logins per e-mail and `X-Forwarded-For` give 429
 * `CHECKOUT__CUSTOMER_AUTH_THROTTLED`; another customer's address id is
 * 400 `CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND`, a default address 400
 * `CHECKOUT__CUSTOMER_ADDRESS_IS_DEFAULT`; a password change logs every
 * session of the customer out; the password recovery answers
 * an unknown e-mail like a known one; a wrong password of the e-mail and
 * password changes is the violation `CUSTOMER_PASSWORD_NOT_CORRECT`.
 */
export function fakeShopwareAccounts(scenario: CustomerScenario) {
  const sent: SentMail[] = [];
  const accounts: FakeAccount[] = [];
  const failures = new Map<string, number>();
  const resets = new Map<string, FakeAccount>();
  let tokens = 0;
  const newToken = () => `context-account-${++tokens}`;
  const holder: { fake?: ReturnType<typeof fakeShopwareOrdering> } = {};
  const fake = () => holder.fake!;
  const accountOf = (token: string) => {
    const customer = fake().customers.get(token) as FakeAccount | undefined;
    return customer && customer.guest === false ? customer : undefined;
  };
  const byEmail = (email: string) =>
    accounts.find((entry) => entry.email === email.trim().toLowerCase());
  const saved = (account: FakeAccount) => `saved-cart-${account.id}`;

  /** Lines of several carts as one, the same id adding up. */
  function merged(carts: Map<string, FakeLine[]>, keys: string[]): FakeLine[] {
    const lines: FakeLine[] = [];
    for (const key of keys) {
      for (const line of carts.get(key) ?? []) {
        const existing = lines.find((entry) => entry.id === line.id);
        if (existing) existing.quantity += line.quantity;
        else lines.push(structuredClone(line));
      }
      carts.delete(key);
    }
    return lines;
  }

  /** A new token for the session; logged in as `account` or nobody. */
  function rotate(
    token: string,
    carts: Map<string, FakeLine[]>,
    account: FakeAccount | undefined,
    keepCart: boolean,
  ): string {
    const next = newToken();
    const { customers, selections } = fake();
    if (account) {
      carts.set(next, merged(carts, [saved(account), token]));
    } else if (keepCart) {
      carts.set(next, merged(carts, [token]));
    } else {
      carts.set(next, []);
    }
    customers.delete(token);
    if (account) customers.set(next, account);
    const selection = selections.get(token);
    selections.delete(token);
    if (selection) selections.set(next, selection);
    return next;
  }

  const addressOf = (account: FakeAccount, id: string) => {
    const address = account.addresses.find((entry) => entry.id === id);
    if (!address) {
      throw violation(400, "CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND", undefined, {
        addressId: id,
      });
    }
    return address;
  };

  const replaceAddress = (account: FakeAccount, address: FakeAddress) => {
    account.addresses = account.addresses.map((entry) =>
      entry.id === address.id ? address : entry,
    );
    if (account.billing.id === address.id) account.billing = address;
    if (account.shipping.id === address.id) account.shipping = address;
  };

  const extension: FakeStoreApiExtension = {
    visitor: ({ method, path, body, forwardedFor }, { token, carts }) => {
      const input = (body ?? {}) as Json;
      const account = accountOf(token);
      const json = (customer: FakeAccount) => ({
        ...fake().customerJson(customer),
        active: customer.active,
        doubleOptInRegistration: customer.doubleOptIn,
        doubleOptInConfirmDate: customer.confirmedAt,
      });

      if (method === "POST" && path === "/account/login") {
        const email = String(input.email ?? "").toLowerCase();
        const key = `${email}|${forwardedFor ?? ""}`;
        if ((failures.get(key) ?? 0) >= 10) {
          throw violation(429, "CHECKOUT__CUSTOMER_AUTH_THROTTLED", undefined, {
            seconds: 10,
          });
        }
        const found = byEmail(email);
        if (!found || found.password !== input.password) {
          failures.set(key, (failures.get(key) ?? 0) + 1);
          throw violation(401, "CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS");
        }
        if (found.doubleOptIn && !found.confirmedAt) {
          throw violation(401, "CHECKOUT__CUSTOMER_OPTIN_NOT_COMPLETED");
        }
        failures.delete(key);
        return {
          data: { redirectUrl: null },
          contextToken: rotate(token, carts, found, false),
        };
      }

      if (method === "POST" && path === "/account/logout") {
        if (!account)
          throw httpError(403, "FRAMEWORK__ROUTING_CUSTOMER_NOT_LOGGED_IN");
        carts.set(saved(account), merged(carts, [saved(account), token]));
        return {
          data: { redirectUrl: null },
          contextToken: rotate(token, carts, undefined, false),
        };
      }

      if (
        method === "POST" &&
        path === "/account/register" &&
        input.guest === false
      ) {
        const email = String(input.email).toLowerCase();
        if (byEmail(email)) {
          throw violation(
            400,
            "VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE",
            "/email",
          );
        }
        if (String(input.password ?? "").length < 8) {
          throw violation(400, "VIOLATION::TOO_SHORT_ERROR", "/password");
        }
        const { nextId } = fake();
        const billing = { ...(input.billingAddress as Json), id: nextId() };
        const shipping = input.shippingAddress
          ? { ...(input.shippingAddress as Json), id: nextId() }
          : billing;
        const created: FakeAccount = {
          id: nextId(),
          guest: false,
          email,
          firstName: input.firstName as string,
          lastName: input.lastName as string,
          salutationId: (input.salutationId as string) || undefined,
          billing,
          shipping,
          addresses: shipping === billing ? [billing] : [billing, shipping],
          password: input.password as string,
          // Shopware 6.7: active right away, the confirmation date tells
          active: true,
          doubleOptIn: scenario.doubleOptIn === true,
          confirmedAt: null,
          confirmHash: null,
        };
        accounts.push(created);
        if (scenario.doubleOptIn) {
          created.confirmHash = `hash-${nextId()}`;
          sent.push({
            to: email,
            kind: "registration",
            confirmation: { em: sha1(email), hash: created.confirmHash },
          });
          // Shopware's answer of a registration loads no associations
          const {
            salutation: _salutation,
            defaultBillingAddress: _billing,
            defaultShippingAddress: _shipping,
            ...plain
          } = json(created) as Record<string, unknown>;
          return { data: plain };
        }
        return {
          data: json(created),
          contextToken: rotate(token, carts, created, true),
        };
      }

      if (method === "POST" && path === "/account/register-confirm") {
        const found = accounts.find(
          (entry) =>
            entry.confirmHash === input.hash && sha1(entry.email) === input.em,
        );
        if (!found)
          throw violation(404, "CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH");
        if (found.confirmedAt) {
          throw violation(412, "CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED");
        }
        found.confirmedAt = new Date().toISOString();
        return {
          data: json(found),
          contextToken: rotate(token, carts, found, true),
        };
      }

      if (!path.startsWith("/account/") || path === "/account/register") {
        return undefined;
      }
      // the rest of the account: a guest's address stays the checkout's
      if (!account) {
        if (
          path === "/account/customer" ||
          path.startsWith("/account/address/")
        ) {
          return undefined;
        }
        throw httpError(403, "FRAMEWORK__ROUTING_CUSTOMER_NOT_LOGGED_IN");
      }

      if (method === "POST" && path === "/account/change-profile") {
        account.firstName = input.firstName as string;
        account.lastName = input.lastName as string;
        if (input.salutationId)
          account.salutationId = input.salutationId as string;
        return { data: { success: true } };
      }
      if (method === "POST" && path === "/account/change-email") {
        if (input.password !== account.password) {
          throw violation(
            400,
            "VIOLATION::CUSTOMER_PASSWORD_NOT_CORRECT",
            "/password",
          );
        }
        const other = byEmail(String(input.email));
        if (other && other !== account) {
          throw violation(
            400,
            "VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE",
            "/email",
          );
        }
        account.email = String(input.email).toLowerCase();
        return { data: { success: true } };
      }
      if (method === "POST" && path === "/account/change-password") {
        if (input.password !== account.password) {
          throw violation(
            400,
            "VIOLATION::CUSTOMER_PASSWORD_NOT_CORRECT",
            "/password",
          );
        }
        account.password = input.newPassword as string;
        // Shopware 6.7 logs every session of the customer out
        for (const [key, value] of fake().customers) {
          if (value === account) fake().customers.delete(key);
        }
        return {
          data: { success: true },
          contextToken: rotate(token, carts, undefined, true),
        };
      }
      if (method === "DELETE" && path === "/account/customer") {
        accounts.splice(accounts.indexOf(account), 1);
        for (const [key, value] of fake().customers) {
          if (value === account) fake().customers.delete(key);
        }
        carts.delete(saved(account));
        return {
          data: null,
          contextToken: rotate(token, carts, undefined, false),
        };
      }
      if (method === "POST" && path === "/account/list-address") {
        return {
          data: { elements: account.addresses.map(fake().addressJson) },
        };
      }
      if (method === "POST" && path === "/account/address") {
        const created = { ...input, id: fake().nextId() };
        account.addresses.push(created);
        return { data: created };
      }
      const defaults = path.match(
        /^\/account\/address\/default-(shipping|billing)\/([^/]+)$/,
      );
      if (method === "PATCH" && defaults) {
        const address = addressOf(account, defaults[2]!);
        if (defaults[1] === "billing") account.billing = address;
        else account.shipping = address;
        return { data: null };
      }
      const single = path.match(/^\/account\/address\/([^/]+)$/);
      if (single && method === "PATCH") {
        const before = addressOf(account, single[1]!);
        const changed = { ...before, ...input, id: before.id } as FakeAddress;
        replaceAddress(account, changed);
        return { data: changed };
      }
      if (single && method === "DELETE") {
        const address = addressOf(account, single[1]!);
        if (
          account.billing.id === address.id ||
          account.shipping.id === address.id
        ) {
          throw violation(400, "CHECKOUT__CUSTOMER_ADDRESS_IS_DEFAULT");
        }
        account.addresses = account.addresses.filter(
          (entry) => entry !== address,
        );
        return { data: null };
      }
      return undefined;
    },

    shopPost: (path, body) => {
      if (path === "/account/recovery-password") {
        const found = byEmail(String(body.email));
        if (found) {
          const hash = `reset-${fake().nextId()}`;
          resets.set(hash, found);
          sent.push({
            to: found.email,
            kind: "password_reset",
            resetToken: hash,
          });
        }
        return { success: true };
      }
      if (path === "/account/recovery-password-confirm") {
        const found = resets.get(String(body.hash));
        if (!found) {
          throw violation(410, "CHECKOUT__CUSTOMER_RECOVERY_HASH_EXPIRED");
        }
        resets.delete(String(body.hash));
        found.password = String(body.newPassword);
        return { success: true };
      }
      return undefined;
    },
  };

  holder.fake = fakeShopwareOrdering(scenario, extension);
  return { ...holder.fake, accounts, mails: () => sent };
}

export const shopwareCustomer: CustomerFixture = {
  adapter: "shopware",
  create: (scenario) => {
    const fake = fakeShopwareAccounts(scenario);
    const backend = createShopwareBackend({
      storeApi: fake.storeApi,
      visitorApi: fake.visitorApi,
      countryId: GERMANY,
      storeUrl: "https://shop.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
    return { backend, mails: fake.mails };
  },
};
