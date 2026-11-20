import type {
  Address,
  Country,
  Customer,
  Id,
  Salutation,
} from "../../shared/domain";
import type { BackendSession } from "./session";

export type Registration = Readonly<{
  email: string;
  password: string;
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  billingAddress: Omit<Address, "id">;
}>;

export type ProfileChange = Readonly<{
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  phone: string | null;
}>;

/**
 * Guest & Account: login, registration, profile and addresses. Login and
 * logout may replace the backend state of the session (Shopware issues a
 * new context token), which the adapter writes back through the session.
 *
 * Shopware: `/account/*`. Sylius: shop users and customers (JWT login).
 */
export interface CustomerPort {
  /** The logged-in customer or guest of the session, null for a visitor. */
  getCustomer(session: BackendSession): Promise<Customer | null>;
  /** Throws `invalid_credentials`. */
  login(
    session: BackendSession,
    email: string,
    password: string,
  ): Promise<Customer>;
  logout(session: BackendSession): Promise<void>;
  /**
   * Creates an account. With double opt-in the customer has to confirm
   * the email first (`confirmationRequired`). Throws `email_taken`.
   */
  register(
    session: BackendSession,
    registration: Registration,
    confirmationUrl: string,
  ): Promise<Readonly<{ customer: Customer; confirmationRequired: boolean }>>;
  /**
   * Confirms a registration from the email link. `token` is opaque: the
   * link's query parameters as they came (Shopware: `hash`, `em`), passed
   * on to the adapter that wrote the link.
   */
  confirmRegistration(
    session: BackendSession,
    token: Readonly<Record<string, string>>,
  ): Promise<Customer>;
  updateProfile(
    session: BackendSession,
    change: ProfileChange,
  ): Promise<Customer>;
  changeEmail(
    session: BackendSession,
    email: string,
    password: string,
  ): Promise<Customer>;
  changePassword(
    session: BackendSession,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  /** Sends a reset link; answers the same whether the email is known. */
  requestPasswordReset(email: string, resetUrl: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  listAddresses(session: BackendSession): Promise<readonly Address[]>;
  /** Creates (id null) or updates an address of the account. */
  saveAddress(session: BackendSession, address: Address): Promise<Address>;
  deleteAddress(session: BackendSession, addressId: Id): Promise<void>;
  setDefaultAddress(
    session: BackendSession,
    addressId: Id,
    use: "billing" | "delivery",
  ): Promise<Customer>;
  /** Deletes the customer's account and logs the session out. */
  deleteAccount(session: BackendSession): Promise<void>;
  /** Countries an address may be in. */
  listCountries(): Promise<readonly Country[]>;
}
