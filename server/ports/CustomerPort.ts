import type {
  Address,
  AddressInput,
  Country,
  Customer,
  GuestDetails,
  Id,
  Salutation,
} from "../../shared/domain";
import type { BackendSession } from "./session";

/**
 * Creating an account ("Registrierung"): the details a guest enters plus a
 * password. The billing address carries the customer's names unless it
 * has its own.
 */
export type Registration = GuestDetails & Readonly<{ password: string }>;

export type RegistrationResult = Readonly<{
  customer: Customer;
  /**
   * Double opt-in: the account waits for the confirmation of its e-mail,
   * the session is not logged in.
   */
  confirmationRequired: boolean;
}>;

export type ProfileChange = Readonly<{
  /** Null keeps the customer's salutation. */
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
}>;

/** An address of the account to save: a new one without id. */
export type AccountAddress = AddressInput & Readonly<{ id: Id | null }>;

/**
 * Guest & Account: login, registration, profile and addresses of the
 * session's customer (ADR 0001, step 6). Login, logout, registration and
 * the confirmation replace the backend state of the session (Shopware
 * issues a new context token; the old one no longer opens the account),
 * which the adapter writes back through the session. The backend merges
 * the visitor's cart into the customer's on login, as it does.
 *
 * Every method but `getCustomer`, `login`, `register`,
 * `confirmRegistration`, the password reset and `listCountries` needs a
 * logged-in customer: `unauthenticated` otherwise. Another customer's
 * address is `not_found`, the same as one that does not exist. A guest's
 * details are changed through `CheckoutPort` (`updateAddress`).
 *
 * Shopware: `/account/*`. Sylius: shop users and customers (JWT login,
 * the token in the session like Shopware's context token), addresses of
 * the address book.
 */
export interface CustomerPort {
  /** The logged-in customer or guest of the session, null for a visitor. */
  getCustomer(session: BackendSession): Promise<Customer | null>;
  /**
   * Logs the session in. `invalid_credentials` (unknown e-mail and wrong
   * password alike), `account_not_confirmed` (right password, double
   * opt-in pending), `rate_limited` (the backend's limit per e-mail and
   * visitor address, `BackendSession.forwardedFor`).
   */
  login(
    session: BackendSession,
    email: string,
    password: string,
  ): Promise<Customer>;
  /** Logs the session out; the cart stays with the customer. */
  logout(session: BackendSession): Promise<void>;
  /**
   * Creates an account and logs the session in, unless the shop asks for
   * a confirmation of the e-mail first. `storefrontUrl` is where links in
   * the backend's e-mails point. `email_taken`, `validation_failed` with
   * `details.fields`.
   */
  register(
    session: BackendSession,
    registration: Registration,
    storefrontUrl: string,
  ): Promise<RegistrationResult>;
  /**
   * Confirms a registration from the e-mail link and logs the session in.
   * `token` is opaque: the link's query parameters as they came
   * (Shopware: `em`, `hash`), passed on to the adapter that wrote the
   * link. `not_found` for an unknown or broken link, `already_confirmed`.
   */
  confirmRegistration(
    session: BackendSession,
    token: Readonly<Record<string, string>>,
  ): Promise<Customer>;
  updateProfile(
    session: BackendSession,
    change: ProfileChange,
  ): Promise<Customer>;
  /** `invalid_credentials` for a wrong password, `email_taken`. */
  changeEmail(
    session: BackendSession,
    email: string,
    password: string,
  ): Promise<Customer>;
  /** `invalid_credentials` for a wrong current password. */
  changePassword(
    session: BackendSession,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  /**
   * Sends a reset link to the e-mail when it has an account; answers the
   * same when it has none (no account enumeration). `rate_limited`.
   */
  requestPasswordReset(
    session: BackendSession,
    email: string,
    storefrontUrl: string,
  ): Promise<void>;
  /**
   * Sets a new password with the token of the reset link. `not_found` for
   * an unknown, used or expired token.
   */
  resetPassword(
    session: BackendSession,
    token: string,
    newPassword: string,
  ): Promise<void>;
  /** The account's addresses. */
  listAddresses(session: BackendSession): Promise<readonly Address[]>;
  /**
   * Creates (id null) or changes an address of the account; a change
   * without a salutation keeps the address's, without a country the
   * address's (a new one is in the shop's country).
   */
  saveAddress(
    session: BackendSession,
    address: AccountAddress,
  ): Promise<Address>;
  /** `address_in_use` for a default address. */
  deleteAddress(session: BackendSession, addressId: Id): Promise<void>;
  setDefaultAddress(
    session: BackendSession,
    addressId: Id,
    use: "billing" | "delivery",
  ): Promise<Customer>;
  /** Deletes the customer's account; the session is a new visitor's. */
  deleteAccount(session: BackendSession): Promise<void>;
  /** Countries an address may be in. */
  listCountries(): Promise<readonly Country[]>;
}
