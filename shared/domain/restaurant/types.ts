import type { Id, TimeOfDay } from "../kernel";
import type { OpeningInterval } from "./openingInterval";

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * The weekly opening hours ("Öffnungszeiten"). A weekday without intervals
 * is a weekly closing day ("Ruhetag").
 */
export type OpeningHours = Readonly<{
  intervals: readonly Readonly<{
    weekday: Weekday;
    interval: OpeningInterval;
  }>[];
}>;

/**
 * A period in which the restaurant stays closed although the weekly hours
 * say open ("Betriebsferien", a holiday). `start`/`end` are ISO 8601
 * date-times, both included.
 */
export type Holiday = Readonly<{
  id: Id;
  start: string;
  end: string;
}>;

/** Whether the restaurant is open right now ("Geöffnet"/"Geschlossen"). */
export type StoreStatus =
  | Readonly<{ open: true; closesAt: TimeOfDay }>
  | Readonly<{
      open: false;
      /** Next opening (ISO 8601 date-time), null if none is known. */
      nextOpening: string | null;
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
  telephone: string | null;
  address: PostalAddress | null;
  googleBusinessProfileUrl: string | null;
}>;

/** A message from a visitor to the restaurant ("Kontakt"). */
export type ContactMessage = Readonly<{
  name: string | null;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}>;
