import type { Id } from "../kernel";
import type { DishConfiguration } from "../menu";

/** ISO 3166-1 alpha-2, e.g. `DE`. */
export type CountryCode = string;

export type Salutation = "mr" | "mrs" | "not_specified";

/** A postal address of a guest or customer (billing or delivery). */
export type Address = Readonly<{
  /** Null for an address not stored in an account. */
  id: Id | null;
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  company: string | null;
  street: string;
  /** Floor, door, "Hinterhaus". */
  additionalLine: string | null;
  postalCode: string;
  city: string;
  country: CountryCode;
  phone: string | null;
}>;

/** What a guest enters to order without an account ("Als Gast bestellen"). */
export type GuestDetails = Readonly<{
  email: string;
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  billingAddress: Omit<Address, "id">;
  deliveryAddress: Omit<Address, "id"> | null;
}>;

/**
 * The person ordering, logged in with an account ("Kundenkonto") or as a
 * guest for the current session.
 */
export type Customer = Readonly<{
  id: Id;
  /** Ordered without an account; no login, no saved addresses. */
  guest: boolean;
  email: string;
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  defaultBillingAddressId: Id | null;
  defaultDeliveryAddressId: Id | null;
}>;

export type Country = Readonly<{ code: CountryCode; name: string }>;

/**
 * A configured dish the guest keeps for later ("Merkliste"); the same dish
 * can be kept twice with different configurations.
 */
export type WishlistEntry = Readonly<{
  id: Id;
  configuration: DishConfiguration;
  dishNumber: string;
  /** ISO 8601 date-time. */
  addedAt: string;
}>;
