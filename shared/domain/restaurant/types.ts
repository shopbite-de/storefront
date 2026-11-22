import type { Salutation } from "../customer";
import type {
  CalendarDate,
  CurrencyCode,
  Id,
  TimeOfDay,
  TimeZone,
} from "../kernel";

/** Whether the restaurant is open right now ("Geöffnet"/"Geschlossen"). */
export type StoreStatus =
  | Readonly<{ open: true; closesAt: TimeOfDay }>
  | Readonly<{
      open: false;
      /** Next opening in the restaurant's time zone, null if none is known. */
      nextOpening: Readonly<{ date: CalendarDate; time: TimeOfDay }> | null;
    }>;

/**
 * Another location of the same restaurant with its own storefront
 * ("Filiale"); the guest switches by opening its URL.
 */
export type Branch = Readonly<{
  id: Id;
  name: string;
  url: string;
  /** This storefront's own branch. */
  current: boolean;
}>;

export type PostalAddress = Readonly<{
  street: string;
  postalCode: string;
  city: string;
}>;

/**
 * What the restaurant has configured in its backend for the storefront.
 * Contact data from the storefront's own configuration wins over it.
 */
export type ShopConfig = Readonly<{
  /** The checkout switch: the restaurant takes online orders now. */
  acceptsOrders: boolean;
  /** IANA time zone of opening hours, holidays and wished times. */
  timeZone: TimeZone;
  telephone: string | null;
  address: PostalAddress | null;
  googleBusinessProfileUrl: string | null;
  /** ISO 4217 code of the shop's prices ("EUR"). */
  currency: CurrencyCode;
  /** BCP 47 tag in which prices are written ("de-DE": "9,50 €"). */
  locale: string;
}>;

/**
 * A message from a visitor to the restaurant ("Kontakt"). Null for a field
 * the visitor left empty; the contact form asks for no salutation.
 */
export type ContactMessage = Readonly<{
  salutation: Salutation | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}>;

/**
 * What the restaurant's contact form asks for beside e-mail, subject and
 * message: whether first name, last name and phone are required.
 */
export type ContactForm = Readonly<{
  required: Readonly<{ firstName: boolean; lastName: boolean; phone: boolean }>;
}>;
