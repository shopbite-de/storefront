import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  deepFreeze,
  DomainError,
  type Address,
  type AddressInput,
  type Country,
  type Customer,
  type Id,
  type Salutation,
} from "../../../shared/domain";
import type { AccountAddress, BackendSession, CustomerPort } from "../../ports";
import type { MemoryCart } from "./cart";
import type { MemoryAccountsView } from "./ordering";

/** What the memory backend would send by e-mail (it sends none). */
export type MemoryMail =
  | Readonly<{
      to: string;
      kind: "registration";
      url: string;
      confirmation: Readonly<Record<string, string>>;
    }>
  | Readonly<{
      to: string;
      kind: "password_reset";
      url: string;
      resetToken: string;
    }>;

type Account = {
  id: Id;
  email: string;
  salt: Buffer;
  passwordHash: Buffer;
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  addresses: Address[];
  defaultBilling: Id;
  defaultDelivery: Id;
  confirmed: boolean;
  /** The confirmation link's secret, kept to tell "already confirmed". */
  confirmHash: string | null;
};

const COUNTRIES: readonly Country[] = deepFreeze([
  { code: "DE", name: "Deutschland" },
  { code: "AT", name: "Österreich" },
  { code: "CH", name: "Schweiz" },
]);

/** Failed logins per e-mail and address before the backend refuses. */
const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 60_000;
const RESET_TTL_MS = 2 * 3600_000;

const unauthenticated = () =>
  new DomainError("unauthenticated", "The account needs a logged-in customer.");
const badCredentials = () =>
  new DomainError("invalid_credentials", "E-mail and password do not match.");
const notFound = (what: string) =>
  new DomainError("not_found", `There is no such ${what}.`);

const normalized = (email: string) => email.trim().toLowerCase();

function hashPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

/**
 * CustomerPort in memory (ADR 0001, step 6): accounts with hashed
 * passwords, addresses and defaults, a login per session token (every
 * login, logout and registration issues a new token, the old one opens
 * nothing), the customer's cart kept apart while logged out and merged
 * with the visitor's on login, failed logins limited per e-mail and
 * visitor address. Mails are handed to `mail` (the demo logs them).
 */
export function createMemoryCustomer(options: {
  cart: MemoryCart;
  /** The guest of a session token (the checkout's). */
  guestOf: (token: string) => Customer | null;
  /** Moves the checkout's state of a token to the new one. */
  moveSession: (from: string, to: string) => void;
  doubleOptIn?: boolean;
  country?: string;
  mail?: (mail: MemoryMail) => void;
  now?: () => number;
}): { customer: CustomerPort; accounts: MemoryAccountsView } {
  const now = options.now ?? Date.now;
  const country = options.country ?? "DE";
  const accounts = new Map<Id, Account>();
  /** Logged-in session tokens. */
  const sessions = new Map<string, Id>();
  const resets = new Map<string, { accountId: Id; expires: number }>();
  const failures = new Map<string, { count: number; since: number }>();

  /** Where a customer's cart waits while no session is logged in. */
  const savedCart = (account: Account) => `saved-cart:${account.id}`;

  const byEmail = (email: string) =>
    [...accounts.values()].find(
      (account) => account.email === normalized(email),
    );

  const toCustomer = (account: Account): Customer =>
    deepFreeze({
      id: account.id,
      guest: false,
      email: account.email,
      salutation: account.salutation,
      firstName: account.firstName,
      lastName: account.lastName,
      phone:
        account.addresses.find((entry) => entry.id === account.defaultBilling)
          ?.phone ?? null,
      defaultBillingAddressId: account.defaultBilling,
      defaultDeliveryAddressId: account.defaultDelivery,
    });

  async function accountOf(session: BackendSession): Promise<Account> {
    const token = await session.read();
    const id = token ? sessions.get(token) : undefined;
    const account = id ? accounts.get(id) : undefined;
    if (!account) throw unauthenticated();
    return account;
  }

  /** A new token for the session, which takes the cart along. */
  async function rotate(
    session: BackendSession,
    loggedIn: Account | null,
  ): Promise<string> {
    const before = await session.read();
    const next = randomUUID();
    // the session of another customer: that cart stays theirs
    const previous = before
      ? accounts.get(sessions.get(before) ?? "")
      : undefined;
    if (before && previous && previous.id !== loggedIn?.id) {
      options.cart.merge([savedCart(previous), before], savedCart(previous));
    }
    if (before) {
      sessions.delete(before);
      options.moveSession(before, next);
    }
    if (loggedIn) {
      // the customer's saved cart first, then the visitor's lines
      options.cart.merge([savedCart(loggedIn), before], next);
      sessions.set(next, loggedIn.id);
    }
    await session.write(next);
    return next;
  }

  const withAddressId = (address: AddressInput, id: Id = randomUUID()) =>
    deepFreeze({
      ...structuredClone(address),
      id,
      country: address.country ?? country,
    }) as Address;

  function checkPassword(account: Account, password: string): boolean {
    const given = hashPassword(password, account.salt);
    return timingSafeEqual(given, account.passwordHash);
  }

  function setPassword(account: Account, password: string) {
    account.salt = randomBytes(16);
    account.passwordHash = hashPassword(password, account.salt);
  }

  function addressOf(account: Account, id: Id): Address {
    const address = account.addresses.find((entry) => entry.id === id);
    if (!address) throw notFound("address");
    return address;
  }

  function changeAddress(account: Account, address: AccountAddress): Address {
    const before = addressOf(account, address.id!);
    const changed = deepFreeze({
      ...structuredClone(address),
      id: before.id,
      salutation: address.salutation ?? before.salutation,
      country: address.country || before.country,
    }) as Address;
    account.addresses = account.addresses.map((entry) =>
      entry.id === before.id ? changed : entry,
    );
    return changed;
  }

  const customer: CustomerPort = {
    getCustomer: async (session) => {
      const token = await session.read();
      if (!token) return null;
      const id = sessions.get(token);
      const account = id ? accounts.get(id) : undefined;
      return account ? toCustomer(account) : options.guestOf(token);
    },

    login: async (session, email, password) => {
      const key = `${normalized(email)}|${session.forwardedFor ?? ""}`;
      const failed = failures.get(key);
      if (failed && now() - failed.since > LOGIN_WINDOW_MS)
        failures.delete(key);
      if ((failures.get(key)?.count ?? 0) >= LOGIN_ATTEMPTS) {
        throw new DomainError("rate_limited", "Too many failed logins.", {
          retryAfterSeconds: Math.ceil(
            (LOGIN_WINDOW_MS - (now() - failures.get(key)!.since)) / 1000,
          ),
        });
      }
      const account = byEmail(email);
      if (!account || !checkPassword(account, password)) {
        const entry = failures.get(key) ?? { count: 0, since: now() };
        entry.count++;
        failures.set(key, entry);
        throw badCredentials();
      }
      if (!account.confirmed) {
        throw new DomainError(
          "account_not_confirmed",
          "The account waits for the confirmation of its e-mail.",
        );
      }
      failures.delete(key);
      await rotate(session, account);
      return toCustomer(account);
    },

    logout: async (session) => {
      const token = await session.read();
      const id = token ? sessions.get(token) : undefined;
      const account = id ? accounts.get(id) : undefined;
      // the cart waits for the customer's next login, with what another
      // session of the customer saved before
      if (account && token) {
        options.cart.merge([savedCart(account), token], savedCart(account));
      }
      await rotate(session, null);
    },

    register: async (session, registration, storefrontUrl) => {
      if (byEmail(registration.email)) {
        throw new DomainError("email_taken", "The e-mail has an account.", {
          field: "email",
        });
      }
      const billing = withAddressId({
        ...registration.billingAddress,
        firstName:
          registration.billingAddress.firstName || registration.firstName,
        lastName: registration.billingAddress.lastName || registration.lastName,
      });
      const delivery = registration.deliveryAddress
        ? withAddressId(registration.deliveryAddress)
        : billing;
      const salt = randomBytes(16);
      const account: Account = {
        id: randomUUID().replaceAll("-", ""),
        email: normalized(registration.email),
        salt,
        passwordHash: hashPassword(registration.password, salt),
        salutation: registration.salutation,
        firstName: registration.firstName,
        lastName: registration.lastName,
        addresses: delivery === billing ? [billing] : [billing, delivery],
        defaultBilling: billing.id!,
        defaultDelivery: delivery.id!,
        confirmed: !options.doubleOptIn,
        confirmHash: null,
      };
      accounts.set(account.id, account);
      if (options.doubleOptIn) {
        account.confirmHash = randomBytes(16).toString("hex");
        const confirmation = {
          em: createHash("sha1").update(account.email).digest("hex"),
          hash: account.confirmHash,
        };
        options.mail?.({
          to: account.email,
          kind: "registration",
          url: `${storefrontUrl.replace(/\/+$/, "")}/registrierung/bestaetigen?${new URLSearchParams(confirmation)}`,
          confirmation,
        });
        return deepFreeze({
          customer: toCustomer(account),
          confirmationRequired: true,
        });
      }
      await rotate(session, account);
      return deepFreeze({
        customer: toCustomer(account),
        confirmationRequired: false,
      });
    },

    confirmRegistration: async (session, token) => {
      const account = [...accounts.values()].find(
        (entry) =>
          entry.confirmHash !== null &&
          entry.confirmHash === token.hash &&
          createHash("sha1").update(entry.email).digest("hex") === token.em,
      );
      if (!account) throw notFound("registration");
      if (account.confirmed) {
        throw new DomainError(
          "already_confirmed",
          "The registration was confirmed before.",
        );
      }
      account.confirmed = true;
      await rotate(session, account);
      return toCustomer(account);
    },

    updateProfile: async (session, change) => {
      const account = await accountOf(session);
      account.salutation = change.salutation ?? account.salutation;
      account.firstName = change.firstName;
      account.lastName = change.lastName;
      return toCustomer(account);
    },

    changeEmail: async (session, email, password) => {
      const account = await accountOf(session);
      if (!checkPassword(account, password)) throw badCredentials();
      const other = byEmail(email);
      if (other && other.id !== account.id) {
        throw new DomainError("email_taken", "The e-mail has an account.", {
          field: "email",
        });
      }
      account.email = normalized(email);
      return toCustomer(account);
    },

    changePassword: async (session, currentPassword, newPassword) => {
      const account = await accountOf(session);
      if (!checkPassword(account, currentPassword)) throw badCredentials();
      setPassword(account, newPassword);
      return deepFreeze({ loggedIn: true });
    },

    requestPasswordReset: async (_session, email, storefrontUrl) => {
      const account = byEmail(email);
      if (!account) return;
      const resetToken = randomBytes(24).toString("hex");
      resets.set(resetToken, {
        accountId: account.id,
        expires: now() + RESET_TTL_MS,
      });
      options.mail?.({
        to: account.email,
        kind: "password_reset",
        url: `${storefrontUrl.replace(/\/+$/, "")}/account/recover/password?hash=${resetToken}`,
        resetToken,
      });
    },

    resetPassword: async (_session, token, newPassword) => {
      const reset = resets.get(token);
      resets.delete(token);
      const account = reset ? accounts.get(reset.accountId) : undefined;
      if (!reset || reset.expires < now() || !account) {
        throw notFound("password reset");
      }
      setPassword(account, newPassword);
    },

    listAddresses: async (session) =>
      deepFreeze([...(await accountOf(session)).addresses]),

    saveAddress: async (session, address) => {
      const account = await accountOf(session);
      if (address.id) return changeAddress(account, address);
      const created = withAddressId(address);
      account.addresses = [...account.addresses, created];
      return created;
    },

    deleteAddress: async (session, addressId) => {
      const account = await accountOf(session);
      addressOf(account, addressId);
      if (
        account.defaultBilling === addressId ||
        account.defaultDelivery === addressId
      ) {
        throw new DomainError(
          "address_in_use",
          "A default address cannot be deleted.",
        );
      }
      account.addresses = account.addresses.filter(
        (entry) => entry.id !== addressId,
      );
    },

    setDefaultAddress: async (session, addressId, use) => {
      const account = await accountOf(session);
      addressOf(account, addressId);
      if (use === "billing") account.defaultBilling = addressId;
      else account.defaultDelivery = addressId;
      return toCustomer(account);
    },

    deleteAccount: async (session) => {
      const account = await accountOf(session);
      accounts.delete(account.id);
      for (const [token, id] of sessions) {
        if (id === account.id) sessions.delete(token);
      }
      options.cart.clear(savedCart(account));
      const token = await session.read();
      if (token) options.cart.clear(token);
      await rotate(session, null);
    },

    listCountries: async () => COUNTRIES,
  };

  const view: MemoryAccountsView = {
    ordererOf: (token) => {
      const id = sessions.get(token);
      const account = id ? accounts.get(id) : undefined;
      if (!account) return undefined;
      return {
        owner: `customer:${account.id}`,
        customer: toCustomer(account),
        billing: addressOf(account, account.defaultBilling),
        delivery: addressOf(account, account.defaultDelivery),
      };
    },
    updateAddress: (token, address) => {
      const id = sessions.get(token);
      const account = id ? accounts.get(id) : undefined;
      if (!account || !address.id) return false;
      if (!account.addresses.some((entry) => entry.id === address.id)) {
        return false;
      }
      changeAddress(account, address);
      return true;
    },
  };

  return { customer, accounts: view };
}
