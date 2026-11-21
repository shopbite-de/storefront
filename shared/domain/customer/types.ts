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
  /** Of a business address, with the company. */
  department: string | null;
  street: string;
  /** Floor, door, "Hinterhaus". */
  additionalLine: string | null;
  postalCode: string;
  city: string;
  country: CountryCode;
  phone: string | null;
}>;

/**
 * An address as the guest enters it: without an id, and without a country
 * when the storefront asks for none (the shop's own country then).
 */
export type AddressInput = Omit<Address, "id" | "country"> &
  Readonly<{ country: CountryCode | null }>;

/** What a guest enters to order without an account ("Als Gast bestellen"). */
export type GuestDetails = Readonly<{
  email: string;
  salutation: Salutation | null;
  firstName: string;
  lastName: string;
  /** Orders as a business ("Geschäftskunde"); the address has a company. */
  business: boolean;
  billingAddress: AddressInput;
  /** Null: delivered to the billing address. */
  deliveryAddress: AddressInput | null;
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
 * Who orders in this session: a guest after entering their details, or the
 * logged-in customer, with the addresses an order would use now (the
 * delivery address is the billing address unless the guest gave another).
 */
export type Orderer = Readonly<{
  customer: Customer;
  billingAddress: Address;
  deliveryAddress: Address;
}>;

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
